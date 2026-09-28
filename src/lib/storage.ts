import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Object storage. Local disk for now (UPLOAD_DIR); swap these three functions for S3/R2 in production.
// Keys look like "<orgId>/<yyyy-mm>/<random>.<ext>" and are stored in Attachment.url as "local:<key>".

const root = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

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

export async function deleteObject(ref: string) {
  if (!ref.startsWith("local:")) return;
  await rm(resolveKey(ref.slice("local:".length)), { force: true });
}

/** Public-facing URL (auth-checked route) for an attachment. */
export function fileUrl(attachmentId: string) {
  return `/api/files/${attachmentId}`;
}
