import "server-only";
import type { TenantDb } from "@/lib/db/tenant";
import { ON_CALL_ROLES, weekDate, weekOf } from "@/lib/on-call";

/** Who is on call at `at`: the week's member, as long as they are still active and in the on-call team. */
export async function onCallUserAt(db: TenantDb, timeZone: string, at = new Date()): Promise<string | null> {
  const week = await db.onCallWeek.findFirst({ where: { weekStart: weekDate(weekOf(at, timeZone)) }, select: { userId: true } });
  if (!week) return null;
  const member = await db.membership.findFirst({
    where: { userId: week.userId, active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { userId: true },
  });
  return member?.userId ?? null;
}

/** Members who can be given on-call weeks (the on-call team). */
export function onCallTeam(db: TenantDb) {
  return db.membership.findMany({
    where: { active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { userId: true, user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}
