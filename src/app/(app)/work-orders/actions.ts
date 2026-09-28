"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext, requirePermission, type AppContext } from "@/lib/context";
import { enumOf, optEnumOf, optId, optNumber, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { deleteObject } from "@/lib/storage";
import {
  changeStatus,
  createWorkOrder,
  resolveRefs,
  stopRunningTimers,
  validateAssignees,
  WorkOrderError,
} from "@/lib/work-orders";
import { ChecklistItemType, Priority, SystemType, WorkOrderStatus, WorkOrderType } from "@/generated/prisma/enums";

const path = (id: string) => `/work-orders/${id}`;

/** Loads a WO the current user may edit (managers, or its creator/assignees with create rights). */
async function editableWorkOrder(ctx: AppContext, id: string) {
  const wo = await ctx.db.workOrder.findUnique({ where: { id }, include: { assignees: true } });
  if (!wo) throw new Error("Not found");
  const involved = wo.createdById === ctx.user.id || wo.assignees.some((a) => a.userId === ctx.user.id);
  if (!ctx.can("workOrders.manage") && !(ctx.can("workOrders.create") && involved)) throw new Error("Forbidden");
  return wo;
}

async function executableWorkOrder(id: string) {
  const ctx = await requirePermission("workOrders.execute");
  const wo = await ctx.db.workOrder.findUnique({ where: { id } });
  if (!wo) throw new Error("Not found");
  return { ctx, wo };
}

// ── Create / edit

const woSchema = z.object({
  title: str(200),
  description: optStr(10000),
  priority: enumOf(Priority),
  type: enumOf(WorkOrderType),
  system: optEnumOf(SystemType),
  villaId: optId(),
  areaId: optId(),
  assetId: optId(),
  teamId: optId(),
  dueDate: z.preprocess((v) => (v ? v : undefined), z.coerce.date().optional()).transform((v) => v ?? null),
  startDate: z.preprocess((v) => (v ? v : undefined), z.coerce.date().optional()).transform((v) => v ?? null),
  estimatedHours: optNumber().refine((v) => v === null || (v >= 0 && v <= 1000)),
});

export async function saveWorkOrderAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("workOrders.create");
  const parsed = parseForm(woSchema, form);
  if (parsed.error) return parsed.error;
  const { estimatedHours, ...data } = parsed.data;
  const assigneeIds = form.getAll("assigneeIds").map(String).filter(Boolean);
  const fields = { ...data, estimatedMinutes: estimatedHours === null ? null : Math.round(estimatedHours * 60) };
  const input = { ...fields, assigneeIds };

  let woId = id;
  try {
    if (id) {
      await editableWorkOrder(ctx, id);
      const refs = await resolveRefs(ctx, input);
      const ids = await validateAssignees(ctx, assigneeIds);
      await ctx.db.workOrder.update({
        where: { id },
        data: { ...fields, ...refs, assignees: { deleteMany: {}, create: ids.map((userId) => ({ userId })) } },
      });
    } else {
      woId = (await createWorkOrder(ctx, input)).id;
    }
  } catch (e) {
    if (e instanceof WorkOrderError) return { error: `wo.${e.code}` };
    throw e;
  }
  revalidatePath("/work-orders");
  redirect(path(woId!));
}

export async function deleteWorkOrderAction(id: string) {
  const ctx = await requirePermission("workOrders.manage");
  const atts = await ctx.db.attachment.findMany({ where: { workOrderId: id }, select: { url: true } });
  await ctx.db.workOrder.delete({ where: { id } });
  await Promise.all(atts.map((a) => deleteObject(a.url)));
  revalidatePath("/work-orders");
  redirect("/work-orders");
}

// ── Status

export async function setStatusAction(id: string, status: WorkOrderStatus, note?: string): Promise<{ error?: string }> {
  const ctx = await requirePermission("workOrders.execute");
  try {
    await changeStatus(ctx, id, enumOf(WorkOrderStatus).parse(status), note ? z.string().max(1000).parse(note) : null);
  } catch (e) {
    if (e instanceof WorkOrderError) return { error: `wo.${e.code}` };
    throw e;
  }
  revalidatePath(path(id));
  revalidatePath("/work-orders");
  return {};
}

// ── Checklist

const itemSchema = z.object({
  type: enumOf(ChecklistItemType),
  label: z.string().trim().min(1).max(300),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  unit: z.string().trim().max(20).nullable().default(null),
});

export async function addItemAction(woId: string, input: z.input<typeof itemSchema>) {
  const ctx = await getContext();
  await editableWorkOrder(ctx, woId);
  const item = itemSchema.parse(input);
  const last = await ctx.db.workOrderItem.findFirst({ where: { workOrderId: woId }, orderBy: { sortOrder: "desc" } });
  await ctx.db.workOrderItem.create({ data: { ...item, workOrderId: woId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  revalidatePath(path(woId));
}

export async function deleteItemAction(woId: string, itemId: string) {
  const ctx = await getContext();
  await editableWorkOrder(ctx, woId);
  await ctx.db.workOrderItem.deleteMany({ where: { id: itemId, workOrderId: woId } });
  revalidatePath(path(woId));
}

export async function moveItemAction(woId: string, itemId: string, direction: -1 | 1) {
  const ctx = await getContext();
  await editableWorkOrder(ctx, woId);
  const items = await ctx.db.workOrderItem.findMany({ where: { workOrderId: woId }, orderBy: { sortOrder: "asc" } });
  const i = items.findIndex((x) => x.id === itemId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await ctx.db.$transaction(items.map((it, idx) => ctx.db.workOrderItem.update({ where: { id: it.id }, data: { sortOrder: idx } })));
  revalidatePath(path(woId));
}

export async function answerItemAction(woId: string, itemId: string, value: string | null, note?: string | null) {
  const { ctx, wo } = await executableWorkOrder(woId);
  if (wo.status === "DONE" || wo.status === "CANCELLED") throw new WorkOrderError("locked");
  const item = await ctx.db.workOrderItem.findFirst({ where: { id: itemId, workOrderId: woId } });
  if (!item) throw new Error("Not found");

  let v = value === null ? null : z.string().max(5000).parse(value).trim() || null;
  if (v !== null) {
    if (item.type === "NUMBER" || item.type === "METER_READING") v = String(z.coerce.number().finite().parse(v));
    if (item.type === "PASS_FAIL") v = z.enum(["PASS", "FAIL", "FLAG"]).parse(v);
    if (item.type === "CHECKBOX") v = z.enum(["true", "false"]).parse(v);
    if (item.type === "MULTIPLE_CHOICE" && !item.options.includes(v)) throw new Error("Invalid choice");
  }
  await ctx.db.workOrderItem.update({
    where: { id: itemId },
    data: {
      value: v,
      note: note === undefined ? undefined : note?.slice(0, 2000) || null,
      completedById: v ? ctx.user.id : null,
      completedAt: v ? new Date() : null,
    },
  });
  // Starting the checklist on an open WO counts as starting work.
  if (v && wo.status === "OPEN") await changeStatus(ctx, woId, "IN_PROGRESS");
  revalidatePath(path(woId));
}

// ── Time tracking

export async function startTimerAction(woId: string) {
  const { ctx, wo } = await executableWorkOrder(woId);
  const running = await ctx.db.timeEntry.findFirst({ where: { workOrderId: woId, userId: ctx.user.id, endedAt: null } });
  if (!running) {
    await ctx.db.timeEntry.create({
      data: { workOrderId: woId, userId: ctx.user.id, startedAt: new Date(), hourlyRate: ctx.membership.hourlyRate },
    });
  }
  if (wo.status === "OPEN" || wo.status === "ON_HOLD") await changeStatus(ctx, woId, "IN_PROGRESS");
  revalidatePath(path(woId));
}

export async function stopTimerAction(woId: string) {
  const { ctx } = await executableWorkOrder(woId);
  await stopRunningTimers(ctx, woId, new Date(), ctx.user.id);
  revalidatePath(path(woId));
}

const timeSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(24 * 60),
  date: z.coerce.date(),
  note: optStr(500),
});

export async function addTimeAction(woId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const { ctx } = await executableWorkOrder(woId);
  const parsed = parseForm(timeSchema, form);
  if (parsed.error) return parsed.error;
  const { minutes, date, note } = parsed.data;
  await ctx.db.timeEntry.create({
    data: {
      workOrderId: woId,
      userId: ctx.user.id,
      startedAt: date,
      endedAt: new Date(date.getTime() + minutes * 60_000),
      minutes,
      note,
      hourlyRate: ctx.membership.hourlyRate,
    },
  });
  revalidatePath(path(woId));
  return { ok: true };
}

export async function deleteTimeAction(woId: string, entryId: string) {
  const { ctx } = await executableWorkOrder(woId);
  const own = ctx.can("workOrders.manage") ? {} : { userId: ctx.user.id };
  await ctx.db.timeEntry.deleteMany({ where: { id: entryId, workOrderId: woId, ...own } });
  revalidatePath(path(woId));
}

// ── Comments & attachments

export async function addCommentAction(woId: string, body: string, attachmentIds: string[] = []) {
  const { ctx } = await executableWorkOrder(woId);
  const text = z.string().trim().max(5000).parse(body);
  if (!text && attachmentIds.length === 0) return;
  const comment = await ctx.db.workOrderComment.create({ data: { workOrderId: woId, userId: ctx.user.id, body: text } });
  if (attachmentIds.length) {
    await ctx.db.attachment.updateMany({
      where: { id: { in: attachmentIds }, workOrderId: woId, uploadedById: ctx.user.id, commentId: null },
      data: { commentId: comment.id },
    });
  }
  revalidatePath(path(woId));
}

export async function deleteAttachmentAction(woId: string, attachmentId: string) {
  const { ctx } = await executableWorkOrder(woId);
  const own = ctx.can("workOrders.manage") ? {} : { uploadedById: ctx.user.id };
  const att = await ctx.db.attachment.findFirst({ where: { id: attachmentId, workOrderId: woId, ...own } });
  if (!att) return;
  await ctx.db.attachment.delete({ where: { id: att.id } });
  await deleteObject(att.url);
  // A photo answer pointing at this file is cleared too.
  if (att.workOrderItemId) {
    await ctx.db.workOrderItem.updateMany({ where: { id: att.workOrderItemId, value: att.id }, data: { value: null, completedAt: null, completedById: null } });
  }
  revalidatePath(path(woId));
}

// ── Other costs

const costSchema = z.object({ description: str(200), amount: z.coerce.number().finite().min(0).max(10_000_000) });

export async function addCostAction(woId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const { ctx } = await executableWorkOrder(woId);
  const parsed = parseForm(costSchema, form);
  if (parsed.error) return parsed.error;
  await ctx.db.workOrderCost.create({ data: { ...parsed.data, workOrderId: woId } });
  revalidatePath(path(woId));
  return { ok: true };
}

export async function deleteCostAction(woId: string, costId: string) {
  const { ctx } = await executableWorkOrder(woId);
  await ctx.db.workOrderCost.deleteMany({ where: { id: costId, workOrderId: woId } });
  revalidatePath(path(woId));
}

// ── Client sign-off

export async function signOffAction(woId: string, signedByName: string, attachmentId: string) {
  const { ctx } = await executableWorkOrder(woId);
  const name = z.string().trim().min(1).max(150).parse(signedByName);
  const att = await ctx.db.attachment.findFirst({ where: { id: attachmentId, workOrderId: woId, mimeType: "image/png" } });
  if (!att) throw new Error("Invalid signature");
  await ctx.db.workOrder.update({
    where: { id: woId },
    data: { signatureUrl: att.id, signedByName: name, signedAt: new Date() },
  });
  revalidatePath(path(woId));
}

export async function clearSignOffAction(woId: string) {
  const { ctx, wo } = await executableWorkOrder(woId);
  if (wo.signatureUrl) {
    const att = await ctx.db.attachment.findUnique({ where: { id: wo.signatureUrl } });
    if (att) {
      await ctx.db.attachment.delete({ where: { id: att.id } });
      await deleteObject(att.url);
    }
  }
  await ctx.db.workOrder.update({ where: { id: woId }, data: { signatureUrl: null, signedByName: null, signedAt: null } });
  revalidatePath(path(woId));
}
