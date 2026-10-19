import "server-only";
import type { TenantDb } from "@/lib/db/tenant";
import { mondayOf, ON_CALL_ROLES, onCallShiftDay, parseOnCallHours, weekDate, weekOf } from "@/lib/on-call";
import { parseBusinessHours } from "@/lib/sla-clock";

/** The member given the week starting on Monday `week`, as long as they are still active and in the on-call team. */
async function weekMember(db: TenantDb, week: string): Promise<string | null> {
  const row = await db.onCallWeek.findFirst({ where: { weekStart: weekDate(week) }, select: { userId: true } });
  if (!row) return null;
  const member = await db.membership.findFirst({
    where: { userId: row.userId, active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { userId: true },
  });
  return member?.userId ?? null;
}

/** Who is on call the week of `at` (what the calendar and the dashboard show), whatever the on-call hours. */
export function onCallUserAt(db: TenantDb, timeZone: string, at = new Date()): Promise<string | null> {
  return weekMember(db, weekOf(at, timeZone));
}

/**
 * Who receives a client request made at `at`: nobody outside the company's on-call hours (Settings → Organization),
 * else the member of the week the current on-call period started in (Sunday night's period runs into Monday).
 */
export async function requestOnCallUser(
  db: TenantDb,
  org: { timezone: string; onCallHours: unknown; businessHours: unknown },
  at = new Date(),
): Promise<string | null> {
  const day = onCallShiftDay(at, org.timezone, parseOnCallHours(org.onCallHours), parseBusinessHours(org.businessHours).holidays);
  return day ? weekMember(db, mondayOf(day)) : null;
}

/** Members who can be given on-call weeks (the on-call team). */
export function onCallTeam(db: TenantDb) {
  return db.membership.findMany({
    where: { active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { userId: true, user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}
