import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";
import { fileUrl, posterRef, putObjectFile } from "@/lib/storage";
import { createAttachment, denyTarget, storageKey, targetSchema } from "@/lib/uploads";
import { processVideo, VideoError } from "@/lib/video";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-rules";

// Short videos (≤ 1 min). The body is the raw file, streamed to a temp folder (it is excluded from the proxy
// matcher, which would buffer it in memory with a 16 MB cap); the target and file name travel in headers.
// The phone normally converts it to a small 720p MP4 first (lib/video-client.ts); ffmpeg then only copies it.

export const maxDuration = 300;

export async function POST(req: Request) {
  const ctx = await getContext();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_VIDEO_UPLOAD_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  if (!(req.headers.get("content-type") ?? "").startsWith("video/")) return NextResponse.json({ error: "badType" }, { status: 415 });
  if (!req.body) return NextResponse.json({ error: "noFile" }, { status: 400 });

  let rawTarget: unknown;
  try {
    rawTarget = JSON.parse(decodeURIComponent(req.headers.get("x-upload-target") ?? "{}"));
  } catch {
    rawTarget = null;
  }
  const target = targetSchema.safeParse(rawTarget);
  if (!target.success) return NextResponse.json({ error: "badTarget" }, { status: 400 });
  const denied = await denyTarget(ctx, target.data);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  const dir = await mkdtemp(path.join(os.tmpdir(), "domusly-video-"));
  try {
    const input = path.join(dir, "input");
    let received = 0;
    const cap = new Transform({
      transform(chunk: Buffer, _enc, done) {
        received += chunk.length;
        done(received > MAX_VIDEO_UPLOAD_BYTES ? new VideoError("tooLarge") : null, chunk);
      },
    });
    try {
      await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), cap, createWriteStream(input));
    } catch (e) {
      if (e instanceof VideoError) return NextResponse.json({ error: "tooLarge" }, { status: 413 });
      throw e;
    }
    if (received === 0) return NextResponse.json({ error: "noFile" }, { status: 400 });

    let out: Awaited<ReturnType<typeof processVideo>>;
    try {
      out = await processVideo(input, dir);
    } catch (e) {
      if (e instanceof VideoError) return NextResponse.json({ error: e.message }, { status: e.message === "videoUnavailable" ? 503 : 422 });
      throw e;
    }

    const ref = await putObjectFile(storageKey(ctx.organization.id, "mp4"), out.video);
    await putObjectFile(posterRef(ref).slice("local:".length), out.poster);
    const name = decodeURIComponent(req.headers.get("x-upload-filename") ?? "").replace(/\.\w+$/, "").slice(0, 190) || "video";
    const att = await createAttachment(ctx, target.data, { ref, filename: `${name}.mp4`, mimeType: "video/mp4", size: (await stat(out.video)).size });
    return NextResponse.json({ id: att.id, url: fileUrl(att.id), filename: att.filename, mimeType: att.mimeType });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
