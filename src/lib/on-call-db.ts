import "server-only";
import type { TenantDb } from "@/lib/db/tenant";
import type { SystemType } from "@/generated/prisma/enums";
import { mondayOf, ON_CALL_ROLES, onCallShiftDay, parseOnCallHours, pickOnCall, weekDate, weekOf } from "@/lib/on-call";
import { parseBusinessHours } from "@/lib/sla-clock";

/** The members given the week starting on Monday `week` who are still active and in the on-call team, by name. */
async function weekMembers(db: TenantDb, week: string): Promise<{ id: string; name: string }[]> {
  const rows = await db.onCallWeek.findMany({ where: { weekStart: weekDate(week) }, select: { userId: true } });
  if (rows.length === 0) return [];
  const members = await db.membership.findMany({
    where: { userId: { in: rows.map((r) => r.userId) }, active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => m.user);
}

/** Who is on call the week of `at` (what the calendar and the dashboard show), whatever the on-call hours. */
export function onCallUsersAt(db: TenantDb, timeZone: string, at = new Date()) {
  return weekMembers(db, weekOf(at, timeZone));
}

/**
 * Who receives a client request made at `at`: nobody outside the company's on-call hours (Settings → Organization);
 * else, of the members of the week the current on-call period started in (Sunday night's period runs into Monday),
 * those in a team whose specialty is the request's system, or all of them when none is (`pickOnCall`).
 */
export async function requestOnCallUsers(
  db: TenantDb,
  org: { timezone: string; onCallHours: unknown; businessHours: unknown },
  system: SystemType | null,
  at = new Date(),
): Promise<string[]> {
  const day = onCallShiftDay(at, org.timezone, parseOnCallHours(org.onCallHours), parseBusinessHours(org.businessHours).holidays);
  if (!day) return [];
  const onCall = (await weekMembers(db, mondayOf(day))).map((u) => u.id);
  if (onCall.length < 2 || !system) return onCall;
  const teams = await db.team.findMany({ where: { system }, select: { members: { select: { userId: true } } } });
  return pickOnCall(onCall, teams.flatMap((t) => t.members.map((m) => m.userId)));
}

/** Members who can be given on-call weeks (the on-call team). */
export function onCallTeam(db: TenantDb) {
  return db.membership.findMany({
    where: { active: true, onCall: true, role: { in: ON_CALL_ROLES } },
    select: { userId: true, user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}
