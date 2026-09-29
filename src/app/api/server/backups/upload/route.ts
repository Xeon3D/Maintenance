import { createWriteStream } from "node:fs";
import { chmod, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { backupDir, backupsAvailable, inspectBackup } from "@/lib/backups";
import { backupFileName } from "@/lib/backup-schedule";
import { requireServerAdmin } from "@/lib/server-admin";

// Receives a backup archive (e.g. from another server) as the raw request body and streams it to disk.
// This route is left out of the proxy matcher so large files aren't buffered; it checks access itself.

const MAX_BYTES = Number(process.env.BACKUP_UPLOAD_MAX_MB || 10_240) * 1024 * 1024;

export async function PUT(req: Request) {
  try {
    await requireServerAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  if (!backupsAvailable()) return new Response("Backups unavailable", { status: 503 });
  if (!req.body) return new Response("Empty", { status: 400 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response("Too large", { status: 413 });

  await mkdir(backupDir(), { recursive: true });
  const tmp = path.join(backupDir(), `.upload-${randomBytes(6).toString("hex")}.part`);
  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      cb(received > MAX_BYTES ? new Error("tooLarge") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as never), limit, createWriteStream(tmp));
    const manifest = await inspectBackup(tmp);
    const name = backupFileName("uploaded", new Date(), manifest.version);
    await chmod(tmp, 0o600);
    await rename(tmp, path.join(backupDir(), name));
    return Response.json({ name });
  } catch (e) {
    await rm(tmp, { force: true });
    const tooLarge = e instanceof Error && e.message === "tooLarge";
    return new Response(tooLarge ? "Too large" : "Invalid backup", { status: tooLarge ? 413 : 400 });
  }
}
