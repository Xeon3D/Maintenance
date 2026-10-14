// A place backups are copied to (lib/backup-copies.ts). Each provider uploads large files in parts.

export interface CloudTarget {
  /** Uploads a local file as `name` into the configured folder (replacing a file with the same name). */
  upload(file: string, name: string, size: number): Promise<void>;
  /** File names in the folder (empty when the folder doesn't exist yet). */
  list(): Promise<string[]>;
  /** Deletes `name` from the folder; a missing file is not an error. */
  remove(name: string): Promise<void>;
}

export class CloudError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Throws a CloudError with the provider's message for a failed response. */
export async function check(res: Response, what: string) {
  if (res.ok) return res;
  const body = (await res.text().catch(() => "")).slice(0, 300);
  throw new CloudError(res.status, `${what}: HTTP ${res.status}${body ? ` — ${body}` : ""}`);
}

/** Reads `length` bytes at `offset` (upload chunks). */
export async function readChunk(file: string, offset: number, length: number) {
  const { open } = await import("node:fs/promises");
  const fh = await open(file, "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, offset);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

export const encodePath = (p: string) => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
