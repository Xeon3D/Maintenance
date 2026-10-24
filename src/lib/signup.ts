import "server-only";
import { prisma } from "@/lib/db/client";
import { getServerSettings } from "@/lib/server-settings";

// Public sign-up ("Create account" on the sign-in page creates a new company). Settings → Server can close it,
// and ALLOW_SIGNUP=false closes it whatever the setting says. While closed, accounts can still be created to
// accept a pending invitation, but no new companies.

/** ALLOW_SIGNUP=false (or 0/no/off) closes sign-up and locks the setting. */
export function signupLockedByEnv(value = process.env.ALLOW_SIGNUP) {
  return /^(false|0|no|off)$/i.test(value?.trim() ?? "");
}

export async function signupOpen() {
  return !signupLockedByEnv() && (await getServerSettings()).allowSignup;
}

/** The invitation token in a sign-up's `next` ("/invite/<token>"), if any. */
export function inviteToken(next: string | undefined) {
  return /^\/invite\/([A-Za-z0-9_-]{10,100})$/.exec(next ?? "")?.[1] ?? null;
}

/** Whether this sign-up may go ahead: always while sign-up is open; while closed, only an account (no company)
 *  for the address of a pending invitation named in `next`. */
export async function signupAllowed({ email, company, next }: { email: string; company?: string; next?: string }) {
  if (await signupOpen()) return true;
  if (company) return false;
  const token = inviteToken(next);
  if (!token) return false;
  const invite = await prisma.invitation.findUnique({ where: { token }, select: { email: true, acceptedAt: true, expiresAt: true } });
  return !!invite && !invite.acceptedAt && invite.expiresAt > new Date() && invite.email.toLowerCase() === email.toLowerCase();
}
