import "server-only";
import type { AppContext } from "@/lib/context";

/** What work-order logic needs; the PM scheduler builds one without a signed-in request. */
export type WoCtx = Pick<AppContext, "db" | "organization" | "user">;
import { assertOwned, nextNumber } from "@/lib/db/tenant";
import { notify, notifyExternal } from "@/lib/notify";
import { contractFor } from "@/lib/contracts";
import type { ChecklistItemType, Priority, SystemType, WorkOrderStatus, WorkOrderType } from "@/generated/prisma/enums";

export const ACTIVE_STATUSES: WorkOrderStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD"];

export class WorkOrderError extends Error {
  constructor(public code: "requiredItems" | "invalidRef" | "invalidAssignee" | "locked") {
    super(code);
  }
}

export type ChecklistItemInput = {
  type: ChecklistItemType;
  label: string;
  description?: string | null;
  required?: boolean;
  options?: string[];
  unit?: string | null;
  meterId?: string | null;
};

export type WorkOrderInput = {
  title: string;
  description?: string | null;
  priority?: Priority;
  type?: WorkOrderType;
  system?: SystemType | null;
  villaId?: string | null;
  areaId?: string | null;
  assetId?: string | null;
  teamId?: string | null;
  procedureId?: string | null;
  pmScheduleId?: string | null;
  contractId?: string | null;
  alertMeterId?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  estimatedMinutes?: number | null;
  assigneeIds?: string[];
  clientVisible?: boolean;
  items?: ChecklistItemInput[];
};

/** Validates villa/area/asset/team consistency and fills villa/area/system from the asset. */
export async function resolveRefs(ctx: WoCtx, input: WorkOrderInput) {
  await assertOwned(ctx.db, "team", [input.teamId]);
  await assertOwned(ctx.db, "procedure", [input.procedureId]);
  let { villaId = null, areaId = null, system = null } = input;
  if (input.assetId) {
    const asset = await ctx.db.asset.findUnique({ where: { id: input.assetId }, select: { villaId: true, areaId: true, system: true } });
    if (!asset || (villaId && asset.villaId !== villaId)) throw new WorkOrderError("invalidRef");
    villaId = asset.villaId;
    areaId = areaId ?? asset.areaId;
    system = system ?? asset.system;
  }
  if (villaId) await assertOwned(ctx.db, "villa", [villaId]);
  if (areaId) {
    const ok = await ctx.db.area.count({ where: { id: areaId, ...(villaId ? { villaId } : {}) } });
    if (!ok) throw new WorkOrderError("invalidRef");
  }
  return { villaId, areaId, system };
}

/** Assignees must be active, non-client members of the org. */
export async function validateAssignees(ctx: WoCtx, ids: string[] = []) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return unique;
  const n = await ctx.db.membership.count({ where: { userId: { in: unique }, active: true, role: { not: "REQUESTER" } } });
  if (n !== unique.length) throw new WorkOrderError("invalidAssignee");
  return unique;
}

export async function createWorkOrder(ctx: WoCtx, input: WorkOrderInput) {
  const refs = await resolveRefs(ctx, input);
  const assigneeIds = await validateAssignees(ctx, input.assigneeIds);

  let items = input.items ?? [];
  if (input.procedureId && items.length === 0) {
    const proc = await ctx.db.procedure.findUnique({ where: { id: input.procedureId }, include: { items: { orderBy: { sortOrder: "asc" } } } });
    items = proc?.items ?? [];
  }
  items = await linkMeterItems(ctx, input.assetId ?? null, items);

  const number = await nextNumber(ctx.organization.id, "workOrder");
  const wo = await ctx.db.workOrder.create({
    data: {
      organizationId: ctx.organization.id,
      number,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "NONE",
      type: input.type ?? "REACTIVE",
      ...refs,
      assetId: input.assetId ?? null,
      teamId: input.teamId ?? null,
      procedureId: input.procedureId ?? null,
      pmScheduleId: input.pmScheduleId ?? null,
      contractId: input.contractId ?? (await contractFor(ctx.db, refs.villaId, refs.system)),
      alertMeterId: input.alertMeterId ?? null,
      dueDate: input.dueDate ?? null,
      startDate: input.startDate ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      clientVisible: input.clientVisible ?? true,
      createdById: ctx.user.id,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      items: {
        create: items.map((it, i) => ({
          sortOrder: i,
          type: it.type,
          label: it.label,
          description: it.description ?? null,
          required: it.required ?? false,
          options: it.options ?? [],
          unit: it.unit ?? null,
          meterId: it.meterId ?? null,
        })),
      },
      statusLogs: { create: { toStatus: "OPEN", userId: ctx.user.id } },
    },
  });
  await notifyAssigned(ctx, wo, assigneeIds);
  return wo;
}

/** WO_ASSIGNED to people newly put on a work order. */
export async function notifyAssigned(ctx: WoCtx, wo: { id: string; number: number; title: string }, userIds: string[]) {
  await notify(ctx, userIds, { type: "WO_ASSIGNED", data: { number: wo.number, title: wo.title, actor: ctx.user.name }, link: `/work-orders/${wo.id}` });
}

/**
 * Meter-reading steps without a meter get linked to the asset's meter when exactly one
 * meter on that asset has the same unit (e.g. a "%" step and the UPS "Battery" meter).
 */
async function linkMeterItems(ctx: WoCtx, assetId: string | null, items: ChecklistItemInput[]) {
  if (!assetId || !items.some((i) => i.type === "METER_READING" && !i.meterId)) return items;
  const meters = await ctx.db.meter.findMany({ where: { assetId }, select: { id: true, unit: true } });
  return items.map((i) => {
    if (i.type !== "METER_READING" || i.meterId) return i;
    const matches = meters.filter((m) => !i.unit || m.unit.toLowerCase() === i.unit.toLowerCase());
    return matches.length === 1 ? { ...i, meterId: matches[0].id, unit: i.unit ?? matches[0].unit } : i;
  });
}

export function isItemComplete(item: { type: ChecklistItemType; value: string | null }) {
  if (item.type === "HEADING") return true;
  if (item.type === "CHECKBOX") return item.value === "true";
  return !!item.value && item.value.trim() !== "";
}

/** Applies a status transition with its side effects (completion stamps, timers, SLA response). */
export async function changeStatus(ctx: WoCtx, workOrderId: string, to: WorkOrderStatus, note?: string | null) {
  const wo = await ctx.db.workOrder.findUnique({
    where: { id: workOrderId },
    include: { items: { select: { type: true, value: true, required: true } } },
  });
  if (!wo) throw new WorkOrderError("invalidRef");
  if (wo.status === to) return wo;

  if (to === "DONE" && wo.items.some((i) => i.required && !isItemComplete(i))) {
    throw new WorkOrderError("requiredItems");
  }

  const now = new Date();
  if (to === "DONE" || to === "CANCELLED") await stopRunningTimers(ctx, workOrderId, now);

  const updated = await ctx.db.workOrder.update({
    where: { id: workOrderId },
    data: {
      status: to,
      completedAt: to === "DONE" ? now : null,
      completedById: to === "DONE" ? ctx.user.id : null,
      firstResponseAt: wo.firstResponseAt ?? (to === "IN_PROGRESS" || to === "DONE" ? now : null),
      statusLogs: { create: { fromStatus: wo.status, toStatus: to, userId: ctx.user.id, note: note || null } },
    },
  });
  await notifyStatus(ctx, updated, note);
  return updated;
}

/** WO_STATUS to the creator and assignees; when a client-visible job from a request is done, the requester too. */
async function notifyStatus(ctx: WoCtx, wo: { id: string; number: number; title: string; status: WorkOrderStatus; createdById: string; clientVisible: boolean }, note?: string | null) {
  const assignees = await ctx.db.workOrderAssignee.findMany({ where: { workOrderId: wo.id }, select: { userId: true } });
  const data = { number: wo.number, title: wo.title, status: wo.status, actor: ctx.user.name, note: note ?? "" };
  await notify(ctx, [wo.createdById, ...assignees.map((a) => a.userId)], { type: "WO_STATUS", data, link: `/work-orders/${wo.id}` });

  if (wo.status !== "DONE" || !wo.clientVisible) return;
  const req = await ctx.db.request.findFirst({ where: { workOrderId: wo.id }, select: { id: true, number: true, requesterId: true, requesterEmail: true } });
  if (!req) return;
  const clientData = { ...data, note: "", request: req.number };
  if (req.requesterId) await notify(ctx, [req.requesterId], { type: "WO_STATUS", data: clientData, link: `/portal/requests/${req.id}` });
  else notifyExternal(ctx.organization, req.requesterEmail, ctx.organization.defaultLocale, "WO_STATUS", clientData);
}

export async function stopRunningTimers(ctx: WoCtx, workOrderId: string, at = new Date(), userId?: string) {
  const running = await ctx.db.timeEntry.findMany({ where: { workOrderId, endedAt: null, ...(userId ? { userId } : {}) } });
  for (const e of running) {
    await ctx.db.timeEntry.update({
      where: { id: e.id },
      data: { endedAt: at, minutes: Math.max(1, Math.round((at.getTime() - e.startedAt.getTime()) / 60_000)) },
    });
  }
}

/** Labour + parts + other costs for a work order. */
export function workOrderCosts(wo: {
  timeEntries: { minutes: number | null; hourlyRate: unknown }[];
  otherCosts: { amount: unknown }[];
  parts?: { quantity: unknown; unitCost: unknown }[];
}) {
  const labor = wo.timeEntries.reduce((s, e) => s + ((e.minutes ?? 0) / 60) * Number(e.hourlyRate ?? 0), 0);
  const minutes = wo.timeEntries.reduce((s, e) => s + (e.minutes ?? 0), 0);
  const other = wo.otherCosts.reduce((s, c) => s + Number(c.amount), 0);
  const parts = (wo.parts ?? []).reduce((s, p) => s + Number(p.quantity) * Number(p.unitCost), 0);
  return { minutes, labor, parts, other, total: labor + parts + other };
}
