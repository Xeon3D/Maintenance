// Rules for short videos on attachments (pure, tested). The server side is lib/video.ts; the browser side
// (conversion before upload) is lib/video-client.ts.

/** Longest video accepted, in seconds (plus a little slack for container rounding). */
export const MAX_VIDEO_SECONDS = 60;
const SLACK_SECONDS = 1.5;
/** Largest upload accepted. Phones normally send a converted ~15 MB file; this is for originals they couldn't convert. */
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024;
/** Stored videos are at most 1280 px on their long edge (720p). */
export const MAX_LONG_EDGE = 1280;
/** Above this, an H.264 stream is re-encoded even when it is already small enough. */
const MAX_COPY_BITRATE = 4_000_000;

export const isVideo = (mimeType: string) => mimeType.startsWith("video/");
/** Thumbnail of a stored video, served by the same route as the file. */
export const posterUrl = (fileUrl: string) => `${fileUrl}?poster=1`;

export type VideoProbe = {
  duration: number;
  video: { codec: string; pixFmt: string; width: number; height: number; rotation: number; bitRate: number | null };
  audio: { codec: string } | null;
};

type RawStream = {
  codec_type?: string;
  codec_name?: string;
  pix_fmt?: string;
  width?: number;
  height?: number;
  bit_rate?: string;
  tags?: Record<string, string>;
  side_data_list?: { rotation?: number }[];
};

/** Reads `ffprobe -print_format json -show_format -show_streams` output; null when there is no video stream. */
export function parseProbe(json: unknown): VideoProbe | null {
  const data = json as { format?: { duration?: string }; streams?: RawStream[] };
  const streams = data?.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video" && s.width && s.height);
  if (!v) return null;
  const a = streams.find((s) => s.codec_type === "audio");
  const rotation = Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0) || 0;
  const bitRate = Number(v.bit_rate);
  return {
    duration: Number(data.format?.duration) || 0,
    video: {
      codec: v.codec_name ?? "",
      pixFmt: v.pix_fmt ?? "",
      width: v.width!,
      height: v.height!,
      rotation,
      bitRate: Number.isFinite(bitRate) && bitRate > 0 ? bitRate : null,
    },
    audio: a ? { codec: a.codec_name ?? "" } : null,
  };
}

export const tooLong = (p: VideoProbe) => p.duration > MAX_VIDEO_SECONDS + SLACK_SECONDS;

/** H.264 in 4:2:0, small and upright already: the stream is copied as it is instead of re-encoded. */
export function canCopyVideo(p: VideoProbe) {
  const v = p.video;
  return (
    v.codec === "h264" &&
    v.pixFmt === "yuv420p" &&
    Math.max(v.width, v.height) <= MAX_LONG_EDGE &&
    v.rotation % 360 === 0 &&
    (v.bitRate === null || v.bitRate <= MAX_COPY_BITRATE)
  );
}

/**
 * ffmpeg arguments that turn any phone video into an MP4 every browser plays: H.264 + AAC, ≤720p, moov at the start
 * (plays while loading), metadata dropped (phones store the GPS location there).
 */
export function ffmpegArgs(input: string, output: string, p: VideoProbe): string[] {
  const edge = MAX_LONG_EDGE;
  const video = canCopyVideo(p)
    ? ["-c:v", "copy"]
    : [
        "-vf",
        `scale='if(gte(iw,ih),min(${edge},trunc(iw/2)*2),-2)':'if(gte(iw,ih),-2,min(${edge},trunc(ih/2)*2))'`,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "2500k", "-bufsize", "5000k", "-pix_fmt", "yuv420p",
      ];
  const audio = !p.audio ? ["-an"] : p.audio.codec === "aac" ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "96k", "-ac", "2"];
  return [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", input,
    "-map", "0:v:0", ...(p.audio ? ["-map", "0:a:0"] : []),
    "-t", String(MAX_VIDEO_SECONDS + SLACK_SECONDS),
    ...video, ...audio,
    "-map_metadata", "-1", "-movflags", "+faststart",
    output,
  ];
}

/** A still from the video (half a second in, or the first frame of a shorter clip) for thumbnails. */
export function posterArgs(input: string, output: string, p: VideoProbe): string[] {
  const at = p.duration > 1 ? "0.5" : "0";
  return ["-hide_banner", "-loglevel", "error", "-y", "-ss", at, "-i", input, "-frames:v", "1", "-vf", "scale='min(640,iw)':-2", "-q:v", "4", output];
}

/** Parses a single `Range: bytes=…` header. Null = serve the whole file; "invalid" = 416. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2])) return null; // multiple ranges or junk: ignore, send everything
  let start: number;
  let end: number;
  if (!m[1]) {
    const suffix = Number(m[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}
