import "server-only";
import { prisma } from "@/lib/db/client";
import type { AppContext } from "@/lib/context";

// Sessions are JWTs (auth.config.ts), so the server keeps no list of who is signed in. Instead each
// request through getContext() stamps Membership.lastSeenAt for the company being used, at most once a
// minute, and "online" means seen in that company in the last ONLINE_MINUTES. Signing out clears the
// stamps so the person drops off at once.

export const SEEN_THROTTLE_MS = 60_000;
export const ONLINE_MINUTES = 5;

/** Whether a request now should write a new lastSeenAt. */
export function shouldTouch(lastSeenAt: Date | null, now = new Date()) {
  return !lastSeenAt || now.getTime() - lastSeenAt.getTime() >= SEEN_THROTTLE_MS;
}

/** Records activity. Raw SQL: no audit-trail entry for it, and it never fails the request. */
export async function touchLastSeen(membership: { id: string; lastSeenAt: Date | null }) {
  if (!shouldTouch(membership.lastSeenAt)) return;
  const cutoff = new Date(Date.now() - SEEN_THROTTLE_MS);
  await prisma.$executeRaw`UPDATE "Membership" SET "lastSeenAt" = now() WHERE id = ${membership.id} AND ("lastSeenAt" IS NULL OR "lastSeenAt" < ${cutoff})`.catch(() => {});
}

export async function clearLastSeen(userId: string) {
  await prisma.$executeRaw`UPDATE "Membership" SET "lastSeenAt" = NULL WHERE "userId" = ${userId}`.catch(() => {});
}

export async function recordSignIn(userId: string) {
  await prisma.$executeRaw`UPDATE "User" SET "lastSignInAt" = now() WHERE id = ${userId}`.catch(() => {});
}

export type OnlineUser = { id: string; name: string; email: string; lastSeenAt: string; lastSignInAt: string | null };

/** Members of the current company seen in it in the last ONLINE_MINUTES. */
export async function listOnlineUsers(db: AppContext["db"]): Promise<OnlineUser[]> {
  const since = new Date(Date.now() - ONLINE_MINUTES * 60_000);
  const members = await db.membership.findMany({
    where: { active: true, lastSeenAt: { gte: since }, user: { erasedAt: null } },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true, user: { select: { id: true, name: true, email: true, lastSignInAt: true } } },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    lastSeenAt: m.lastSeenAt!.toISOString(),
    lastSignInAt: m.user.lastSignInAt?.toISOString() ?? null,
  }));
}
