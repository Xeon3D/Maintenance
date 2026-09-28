import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";

// Password-reset tokens live in VerificationToken as SHA-256 hashes (a DB leak doesn't expose
// usable links), keyed "reset:<userId>", valid for an hour, at most 3 outstanding per account.

const TTL_MS = 60 * 60 * 1000;
const MAX_OUTSTANDING = 3;

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const identifier = (userId: string) => `reset:${userId}`;

/** A new raw token for the link, or null when the account already has too many live ones. */
export async function createResetToken(userId: string) {
  const now = new Date();
  await prisma.verificationToken.deleteMany({ where: { identifier: identifier(userId), expires: { lt: now } } });
  const live = await prisma.verificationToken.count({ where: { identifier: identifier(userId) } });
  if (live >= MAX_OUTSTANDING) return null;
  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({ data: { identifier: identifier(userId), token: hash(raw), expires: new Date(now.getTime() + TTL_MS) } });
  return raw;
}

/** The user a live token belongs to, or null. */
export async function userForResetToken(raw: string) {
  if (!raw || raw.length > 100) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hash(raw) } });
  if (!row || row.expires < new Date() || !row.identifier.startsWith("reset:")) return null;
  return prisma.user.findUnique({ where: { id: row.identifier.slice("reset:".length) }, select: { id: true, email: true, name: true } });
}

/** Every outstanding reset link for the user stops working (after a reset or a password change). */
export async function clearResetTokens(userId: string) {
  await prisma.verificationToken.deleteMany({ where: { identifier: identifier(userId) } });
}
