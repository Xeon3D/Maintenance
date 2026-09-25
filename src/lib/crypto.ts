import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for sensitive fields (villa access codes, device credentials).
// Format: v1.<iv>.<tag>.<ciphertext>, all base64url.

function key(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes (base64)");
  return buf;
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptField(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1") throw new Error("Unknown ciphertext version");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
