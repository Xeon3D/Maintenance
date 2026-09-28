"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned, nextNumber } from "@/lib/db/tenant";
import { optDate, optId, optNumber, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { deleteObject } from "@/lib/storage";
import { addLowStockLines, InventoryError, receivePurchaseOrder } from "@/lib/inventory";
import { poActions, type PoAction } from "@/lib/inventory-math";
import type { PurchaseOrderStatus } from "@/generated/prisma/enums";

const path = (id: string) => `/purchase-orders/${id}`;
const money = () => z.coerce.number().finite().min(0).max(10_000_000);

async function guarded(fn: () => Promise<unknown>): Promise<FormResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof InventoryError) return { error: `stock.${e.code}` };
    throw e;
  }
}

async function loadPo(id: string) {
  const ctx = await requirePermission("purchasing.manage");
  const po = await ctx.db.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po) throw new Error("Not found");
  return { ctx, po };
}

async function draftPo(id: string) {
  const r = await loadPo(id);
  if (r.po.status !== "DRAFT") throw new InventoryError("notEditable");
  return r;
}

// ── Header

const headerSchema = z.object({
  vendorId: str(40),
  shipToLocationId: optId(),
  workOrderId: optId(),
  expectedDate: optDate(),
  tax: money(),
  shipping: money(),
  notes: optStr(5000),
});

export async function savePoAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("purchasing.manage");
  const parsed = parseForm(headerSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;
  await assertOwned(ctx.db, "vendor", [data.vendorId]);
  await assertOwned(ctx.db, "stockLocation", [data.shipToLocationId]);
  await assertOwned(ctx.db, "workOrder", [data.workOrderId]);

  if (id) {
    const res = await guarded(async () => {
      await draftPo(id);
      await ctx.db.purchaseOrder.update({ where: { id }, data });
    });
    revalidatePath(path(id));
    return res;
  }
  const number = await nextNumber(ctx.organization.id, "purchaseOrder");
  const po = await ctx.db.purchaseOrder.create({
    data: { ...data, organizationId: ctx.organization.id, number, createdById: ctx.user.id },
  });
  if (form.get("lowStock") === "on") await addLowStockLines(ctx, po.id).catch(() => 0);
  revalidatePath("/purchase-orders");
  redirect(path(po.id));
}

export async function deletePoAction(id: string) {
  const { ctx, po } = await loadPo(id);
  const received = po.lines.some((l) => Number(l.receivedQuantity) > 0);
  if (received || !(po.status === "DRAFT" || po.status === "CANCELLED")) throw new InventoryError("notEditable");
  const files = await ctx.db.attachment.findMany({ where: { purchaseOrderId: id } });
  await ctx.db.purchaseOrder.delete({ where: { id } });
  await Promise.all(files.map((f) => deleteObject(f.url).catch(() => undefined)));
  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

// ── Lines

const lineSchema = z.object({
  partId: optId(),
  description: optStr(300),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  unitCost: optNumber().refine((v) => v === null || (v >= 0 && v <= 10_000_000)),
});

export async function addLineAction(poId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const parsed = parseForm(lineSchema, form);
  if (parsed.error) return parsed.error;
  const { partId, description, quantity, unitCost } = parsed.data;
  return guarded(async () => {
    const { ctx, po } = await draftPo(poId);
    const part = partId ? await ctx.db.part.findFirst({ where: { id: partId, archivedAt: null } }) : null;
    if (partId && !part) throw new InventoryError("invalidRef");
    const text = description ?? part?.name;
    if (!text) throw new InventoryError("invalidRef");
    await ctx.db.purchaseOrderLine.create({
      data: { purchaseOrderId: po.id, partId: part?.id ?? null, description: text, quantity, unitCost: unitCost ?? Number(part?.unitCost ?? 0) },
    });
    revalidatePath(path(poId));
  });
}

export async function deleteLineAction(poId: string, lineId: string) {
  const { ctx, po } = await draftPo(poId);
  await ctx.db.purchaseOrderLine.deleteMany({ where: { id: lineId, purchaseOrderId: po.id } });
  revalidatePath(path(poId));
}

export async function addLowStockLinesAction(poId: string): Promise<{ error?: string; added?: number }> {
  const ctx = await requirePermission("purchasing.manage");
  try {
    const added = await addLowStockLines(ctx, poId);
    revalidatePath(path(poId));
    return { added };
  } catch (e) {
    if (e instanceof InventoryError) return { error: `stock.${e.code}` };
    throw e;
  }
}

// ── Workflow

const NEXT: Record<PoAction, PurchaseOrderStatus> = {
  submit: "PENDING_APPROVAL",
  approve: "APPROVED",
  reject: "DRAFT",
  order: "ORDERED",
  cancel: "CANCELLED",
  reopen: "DRAFT",
};

export async function poTransitionAction(poId: string, action: PoAction): Promise<{ error?: string }> {
  const { ctx, po } = await loadPo(poId);
  const canApprove = ctx.can("purchasing.approve");
  const hasReceipts = po.lines.some((l) => Number(l.receivedQuantity) > 0);
  if (!poActions(po.status, { canApprove, hasReceipts }).includes(action)) return { error: "stock.notEditable" };
  if ((action === "submit" || action === "approve") && po.lines.length === 0) return { error: "po.needLines" };

  await ctx.db.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: NEXT[action],
      ...(action === "approve" ? { approvedById: ctx.user.id, approvedAt: new Date() } : {}),
      ...(action === "reject" || action === "reopen" ? { approvedById: null, approvedAt: null } : {}),
      ...(action === "order" ? { orderDate: new Date() } : {}),
    },
  });
  revalidatePath(path(poId));
  revalidatePath("/purchase-orders");
  return {};
}

// ── Receiving

export async function receiveAction(poId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("purchasing.manage");
  const receipts: { lineId: string; quantity: number }[] = [];
  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of form) {
    if (!key.startsWith("qty.")) continue;
    const raw = String(value).trim();
    if (!raw) continue;
    const q = Number(raw);
    if (!Number.isFinite(q) || q < 0) fieldErrors[key] = "invalid";
    else if (q > 0) receipts.push({ lineId: key.slice(4), quantity: q });
  }
  if (Object.keys(fieldErrors).length) return { error: "validation", fieldErrors };
  const locationId = optId().parse(form.get("locationId"));
  const res = await guarded(() => receivePurchaseOrder(ctx, poId, receipts, locationId));
  revalidatePath(path(poId));
  revalidatePath("/parts");
  return res;
}

// ── Attachments (quotes, invoices, delivery notes)

export async function deletePoAttachmentAction(poId: string, attachmentId: string) {
  const ctx = await requirePermission("purchasing.manage");
  const att = await ctx.db.attachment.findFirst({ where: { id: attachmentId, purchaseOrderId: poId } });
  if (!att) return;
  await ctx.db.attachment.delete({ where: { id: att.id } });
  await deleteObject(att.url);
  revalidatePath(path(poId));
}
