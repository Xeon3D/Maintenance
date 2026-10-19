import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { ffmpegArgs, parseProbe, posterArgs, tooLong } from "@/lib/video-rules";

const run = promisify(execFile);
// The Docker image installs both; FFMPEG_PATH / FFPROBE_PATH point elsewhere when needed.
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
const TIMEOUT_MS = 3 * 60_000;

export class VideoError extends Error {}

/**
 * Turns an uploaded video into `video.mp4` + `poster.jpg` in `dir`: checks it is a video of at most a minute,
 * then copies or re-encodes it (rules in lib/video-rules.ts). Error codes: badVideo, videoTooLong, videoUnavailable.
 */
export async function processVideo(input: string, dir: string) {
  let probeJson: string;
  try {
    probeJson = (await run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input], { timeout: 30_000, maxBuffer: 4 << 20 })).stdout;
  } catch (e) {
    throw new VideoError(missing(e) ? "videoUnavailable" : "badVideo");
  }
  const probe = parseProbe(JSON.parse(probeJson || "{}"));
  if (!probe) throw new VideoError("badVideo");
  if (tooLong(probe)) throw new VideoError("videoTooLong");

  const video = path.join(dir, "video.mp4");
  const poster = path.join(dir, "poster.jpg");
  try {
    await run(FFMPEG, ffmpegArgs(input, video, probe), { timeout: TIMEOUT_MS });
    await run(FFMPEG, posterArgs(video, poster, probe), { timeout: 30_000 });
  } catch (e) {
    if (missing(e)) throw new VideoError("videoUnavailable");
    console.error("ffmpeg failed", e);
    throw new VideoError("badVideo");
  }
  return { video, poster, duration: probe.duration };
}

const missing = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT";
