import "server-only";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Object storage. Local disk for now (UPLOAD_DIR); swap these three functions for S3/R2 in production.
// Keys look like "<orgId>/<yyyy-mm>/<random>.<ext>" and are stored in Attachment.url as "local:<key>".

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const root = uploadRoot;

function resolveKey(key: string) {
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function putObject(key: string, data: Buffer): Promise<string> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return `local:${key}`;
}

export async function getObject(ref: string): Promise<Buffer> {
  if (!ref.startsWith("local:")) throw new Error("Unsupported storage ref");
  return readFile(resolveKey(ref.slice("local:".length)));
}

/** Stores a file that is already on disk (large uploads are streamed to a temp file first). */
export async function putObjectFile(key: string, source: string): Promise<string> {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await copyFile(source, full);
  return `local:${key}`;
}

function localPath(ref: string) {
  if (!ref.startsWith("local:")) throw new Error("Unsupported storage ref");
  return resolveKey(ref.slice("local:".length));
}

export async function objectSize(ref: string): Promise<number> {
  return (await stat(localPath(ref))).size;
}

/** Streams an object, or the inclusive byte range [start, end] of it (video players ask for ranges). */
export function objectStream(ref: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(localPath(ref), range)) as ReadableStream<Uint8Array>;
}

/** A video's thumbnail is stored next to it: "<key>.mp4" → "<key>.poster.jpg". */
export function posterRef(ref: string) {
  return ref.replace(/\.mp4$/, ".poster.jpg");
}

export async function deleteObject(ref: string) {
  if (!ref.startsWith("local:")) return;
  await rm(resolveKey(ref.slice("local:".length)), { force: true });
  if (ref.endsWith(".mp4")) await rm(resolveKey(posterRef(ref).slice("local:".length)), { force: true });
}

/** Public-facing URL (auth-checked route) for an attachment. */
export function fileUrl(attachmentId: string) {
  return `/api/files/${attachmentId}`;
}

/** Deletes every stored file (factory reset). Empties UPLOAD_DIR but keeps the folder, which may be a mounted volume. */
export async function clearAllObjects() {
  const dir = root();
  if (path.parse(dir).root === dir) throw new Error("Refusing to clear a filesystem root");
  const entries = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(entries.map((e) => rm(path.join(dir, e), { recursive: true, force: true })));
}
