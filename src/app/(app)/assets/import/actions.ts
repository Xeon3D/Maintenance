"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { commitImport, planImport, type ImportError } from "./plan";

const csvSchema = z.string().min(1).max(5_000_000);

export type ImportPreview = {
  errors: ImportError[];
  rowCount: number;
  newAreas: number;
  villas: number;
  sample: { name: string; system: string; villaId: string; area: string | null }[];
};

export async function previewImportAction(csv: string): Promise<ImportPreview> {
  const ctx = await requirePermission("assets.manage");
  const plan = await planImport(ctx, csvSchema.parse(csv));
  return {
    errors: plan.errors.slice(0, 100),
    rowCount: plan.rows.length,
    newAreas: plan.newAreas.length,
    villas: plan.villasTouched,
    sample: plan.rows.slice(0, 10).map((r) => ({ name: r.data.name, system: r.data.system, villaId: r.data.villaId, area: r.areaName })),
  };
}

export async function commitImportAction(csv: string): Promise<{ created?: number; errors?: ImportError[] }> {
  const ctx = await requirePermission("assets.manage");
  const plan = await planImport(ctx, csvSchema.parse(csv));
  if (plan.errors.length) return { errors: plan.errors.slice(0, 100) };
  const created = await commitImport(ctx, plan);
  revalidatePath("/assets");
  revalidatePath("/villas", "layout");
  return { created };
}
