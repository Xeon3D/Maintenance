"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { parseForm, str, type FormResult } from "@/lib/forms";

// Work-order categories (e.g. "Warranty", "Billable", "Callout"): labels for filtering and reporting.

const categorySchema = z.object({
  name: str(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
});

export async function saveCategoryAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("workOrders.manage");
  const parsed = parseForm(categorySchema, form);
  if (parsed.error) return parsed.error;
  const clash = await ctx.db.category.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: "validation", fieldErrors: { name: "categoryTaken" } };
  if (id) await ctx.db.category.updateMany({ where: { id }, data: parsed.data });
  else await ctx.db.category.create({ data: { ...parsed.data, organizationId: ctx.organization.id } });
  revalidatePath("/settings/categories");
  return { ok: true };
}

/** Deleting a category only removes the label from its work orders. */
export async function deleteCategoryAction(id: string) {
  const ctx = await requirePermission("workOrders.manage");
  await ctx.db.category.deleteMany({ where: { id } });
  revalidatePath("/settings/categories");
}
