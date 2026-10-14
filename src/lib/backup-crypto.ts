import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

// Optional backup encryption (GDPR art. 32): with BACKUP_PASSWORD set, each archive is sealed with
// AES-256-GCM under a key derived by scrypt. File layout: MAGIC | salt (16) | iv (12) | ciphertext | tag (16).
// The archive name stays the same; encrypted files are recognised by the magic bytes.

const MAGIC = Buffer.from("VOPSENC1");
const SALT = 16;
const IV = 12;
const TAG = 16;
const HEADER = MAGIC.length + SALT + IV;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export class BackupCryptoError extends Error {
  constructor(public code: "encryptedNoPassword" | "wrongBackupPassword") {
    super(code);
  }
}

export const backupPassword = () => process.env.BACKUP_PASSWORD || null;

const deriveKey = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 32, SCRYPT, (e, key) => (e ? reject(e) : resolve(key))));

export async function isEncrypted(file: string) {
  const fh = await open(file, "r");
  try {
    const buf = Buffer.alloc(MAGIC.length);
    const { bytesRead } = await fh.read(buf, 0, MAGIC.length, 0);
    return bytesRead === MAGIC.length && buf.equals(MAGIC);
  } finally {
    await fh.close();
  }
}

export async function encryptFile(src: string, dst: string, password: string) {
  const salt = randomBytes(SALT);
  const iv = randomBytes(IV);
  const cipher = createCipheriv("aes-256-gcm", await deriveKey(password, salt), iv);
  const out = createWriteStream(dst, { mode: 0o600 });
  out.write(Buffer.concat([MAGIC, salt, iv]));
  await pipeline(createReadStream(src), cipher, out, { end: false });
  await new Promise<void>((resolve, reject) => out.end(cipher.getAuthTag(), (e?: Error | null) => (e ? reject(e) : resolve())));
}

/** Decrypts to `dst`; a wrong password or a modified file fails the tag check (and leaves `dst` to be deleted). */
export async function decryptFile(src: string, dst: string, password: string | null) {
  if (!password) throw new BackupCryptoError("encryptedNoPassword");
  const { size } = await stat(src);
  if (size < HEADER + TAG) throw new BackupCryptoError("wrongBackupPassword");
  const fh = await open(src, "r");
  const head = Buffer.alloc(HEADER);
  const tag = Buffer.alloc(TAG);
  try {
    await fh.read(head, 0, HEADER, 0);
    await fh.read(tag, 0, TAG, size - TAG);
  } finally {
    await fh.close();
  }
  const salt = head.subarray(MAGIC.length, MAGIC.length + SALT);
  const iv = head.subarray(MAGIC.length + SALT);
  const decipher = createDecipheriv("aes-256-gcm", await deriveKey(password, salt), iv);
  decipher.setAuthTag(tag);
  try {
    await pipeline(createReadStream(src, { start: HEADER, end: size - TAG - 1 }), decipher, createWriteStream(dst, { mode: 0o600 }));
  } catch {
    throw new BackupCryptoError("wrongBackupPassword");
  }
}
