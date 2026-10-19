"use client";

import { MAX_LONG_EDGE, MAX_VIDEO_SECONDS, MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-rules";

// Converts a phone video to a small 720p H.264 MP4 in the browser (WebCodecs, through Mediabunny) before it is
// uploaded or queued offline: a minute of phone video is 60–400 MB, the converted file ~15 MB. Where the browser
// can't convert it, the original is sent and the server converts it (lib/video.ts).

const VIDEO_EXT = /\.(mp4|m4v|mov|3gp|3g2|webm|mkv|avi)$/i;

export const looksLikeVideo = (file: File) => file.type.startsWith("video/") || (!file.type && VIDEO_EXT.test(file.name));

/** Loads the converter ahead of time (the field app does this so it is cached for offline use). */
export const preloadVideoConverter = () => import("mediabunny").then(() => undefined, () => undefined);

/** A video file ready to upload. Throws `videoTooLong` or `tooLarge` (message keys under `files.`). */
export async function prepareVideo(file: File, onProgress?: (fraction: number) => void): Promise<File> {
  const converted = await convert(file, onProgress).catch((e: unknown) => {
    if (e instanceof Error && e.message === "videoTooLong") throw e;
    console.warn("Video conversion failed; sending the original", e);
    return null;
  });
  if (converted) return converted;
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) throw new Error("tooLarge");
  return file.type.startsWith("video/") ? file : new File([file], file.name, { type: "video/mp4" });
}

async function convert(file: File, onProgress?: (fraction: number) => void): Promise<File | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const duration = await input.computeDuration();
  if (duration > MAX_VIDEO_SECONDS + 1) throw new Error("videoTooLong");

  const track = await input.getPrimaryVideoTrack();
  if (!track) return null;
  const audioTrack = await input.getPrimaryAudioTrack();
  const audioCodec = (await mb.canEncodeAudio("aac")) ? "aac" : (await mb.canEncodeAudio("opus")) ? "opus" : null;
  if (audioTrack && !audioCodec) return null; // keep the sound: the server will convert it

  const w = track.displayWidth;
  const h = track.displayHeight;
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(w, h));
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const width = even(w * scale);
  const height = even(h * scale);
  if (!(await mb.canEncodeVideo("avc", { width, height }))) return null;

  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
  const conversion = await mb.Conversion.init({
    input,
    output,
    tracks: "primary",
    // Rotation baked into the frames (the server then copies the stream as it is); width alone keeps the aspect ratio.
    video: { codec: "avc", width, quality: mb.QUALITY_MEDIUM, allowTransformationMetadata: false, forceTranscode: true },
    audio: audioCodec ? { codec: audioCodec, quality: mb.QUALITY_MEDIUM } : { discard: true },
    tags: {}, // drops the metadata, including where it was filmed
  });
  // A video or sound track the browser can't decode would be dropped: let the server convert it instead.
  if (!conversion.isValid || conversion.discardedTracks.some((d) => d.track === track || (d.track === audioTrack && d.reason !== "discarded_by_user"))) return null;
  if (onProgress) conversion.onProgress = (p) => onProgress(p);
  await conversion.execute();
  const buffer = output.target.buffer;
  if (!buffer) return null;
  return new File([buffer], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });
}
