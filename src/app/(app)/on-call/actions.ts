"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/context";
import { isDay, mondayOf, ON_CALL_ROLES, weekDate, weekOf } from "@/lib/on-call";

/** Gives the week starting on Monday `week` to `userId` (a member of the on-call team), or clears it (""). */
export async function setOnCallWeekAction(week: string, userId: string) {
  const ctx = await requirePermission("onCall.manage");
  if (!isDay(week) || mondayOf(week) !== week) throw new Error("Invalid week");
  const weekStart = weekDate(week);
  if (!userId) {
    await ctx.db.onCallWeek.deleteMany({ where: { weekStart } });
  } else {
    const member = await ctx.db.membership.findFirst({ where: { userId, active: true, onCall: true, role: { in: ON_CALL_ROLES } }, select: { id: true } });
    if (!member) throw new Error("Not in the on-call team");
    const existing = await ctx.db.onCallWeek.findFirst({ where: { weekStart }, select: { id: true, userId: true } });
    if (existing?.userId === userId) return;
    if (existing) await ctx.db.onCallWeek.update({ where: { id: existing.id }, data: { userId } });
    else await ctx.db.onCallWeek.create({ data: { organizationId: ctx.organization.id, weekStart, userId } });
  }
  revalidatePath("/on-call");
}

/** Adds a staff member to the on-call team, or removes them (and frees their weeks from this one on). */
export async function setOnCallMemberAction(userId: string, onCall: boolean) {
  const ctx = await requirePermission("onCall.manage");
  const member = await ctx.db.membership.findFirst({ where: { userId, active: true, role: { in: ON_CALL_ROLES } }, select: { id: true, onCall: true } });
  if (!member) throw new Error("Not a staff member");
  if (member.onCall !== onCall) await ctx.db.membership.update({ where: { id: member.id }, data: { onCall } });
  if (!onCall) {
    // Past weeks stay as a record of who was on call; current and future ones need someone else.
    await ctx.db.onCallWeek.deleteMany({ where: { userId, weekStart: { gte: weekDate(weekOf(new Date(), ctx.organization.timezone)) } } });
  }
  revalidatePath("/on-call");
}
