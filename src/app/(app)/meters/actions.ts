"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { optNumber, parseForm, str, type FormResult } from "@/lib/forms";
import { recordReading } from "@/lib/meters";

const meterSchema = z
  .object({
    name: str(100),
    unit: str(20),
    lowerLimit: optNumber(),
    upperLimit: optNumber(),
    alertWorkOrder: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((m) => m.lowerLimit === null || m.upperLimit === null || m.lowerLimit < m.upperLimit, {
    path: ["upperLimit"],
    message: "invalid",
  });

export async function saveMeterAction(assetId: string, meterId: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("assets.manage");
  await assertOwned(ctx.db, "asset", [assetId]);
  const parsed = parseForm(meterSchema, form);
  if (parsed.error) return parsed.error;
  if (meterId) await ctx.db.meter.update({ where: { id: meterId }, data: parsed.data });
  else await ctx.db.meter.create({ data: { ...parsed.data, assetId, organizationId: ctx.organization.id } });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/meters");
  return { ok: true };
}

export async function deleteMeterAction(meterId: string) {
  const ctx = await requirePermission("assets.manage");
  const m = await ctx.db.meter.delete({ where: { id: meterId } });
  revalidatePath(`/assets/${m.assetId}`);
  revalidatePath("/meters");
}

export async function recordReadingAction(meterId: string, raw: string): Promise<{ error?: string; outOfRange?: boolean; created?: number }> {
  const ctx = await requirePermission("workOrders.execute");
  const value = z.coerce.number().finite().safeParse(String(raw).replace(",", "."));
  if (!value.success || String(raw).trim() === "") return { error: "invalid" };
  const res = await recordReading(ctx, meterId, value.data);
  const m = await ctx.db.meter.findUnique({ where: { id: meterId }, select: { assetId: true } });
  revalidatePath(`/assets/${m?.assetId}`);
  revalidatePath("/meters");
  revalidatePath("/work-orders");
  return { outOfRange: res.outOfRange, created: res.pmCreated + (res.alertWorkOrderId ? 1 : 0) };
}
