"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, type AppContext } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { descendantsOf } from "@/lib/tree";
import { enumOf, parseForm, type FormResult } from "@/lib/forms";
import { AssetStatus } from "@/generated/prisma/enums";
import { assetSchema, type AssetInput } from "./schema";

/** Checks area/parent belong to the same villa and the parent isn't the asset itself or a descendant. */
async function validateRefs(ctx: AppContext, data: AssetInput, assetId: string | null): Promise<FormResult | null> {
  await assertOwned(ctx.db, "villa", [data.villaId]);
  await assertOwned(ctx.db, "vendor", [data.vendorId]);
  if (data.areaId) {
    const area = await ctx.db.area.findFirst({ where: { id: data.areaId, villaId: data.villaId } });
    if (!area) return { error: "validation", fieldErrors: { areaId: "invalid" } };
  }
  if (data.parentId) {
    const parent = await ctx.db.asset.findFirst({ where: { id: data.parentId, villaId: data.villaId } });
    if (!parent) return { error: "validation", fieldErrors: { parentId: "invalid" } };
    if (assetId) {
      const all = await ctx.db.asset.findMany({ where: { villaId: data.villaId }, select: { id: true, parentId: true, name: true } });
      if (descendantsOf(all, assetId).has(data.parentId)) return { error: "validation", fieldErrors: { parentId: "invalid_parent" } };
    }
  }
  return null;
}

export async function saveAssetAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("assets.manage");
  const parsed = parseForm(assetSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;
  const refError = await validateRefs(ctx, data, id);
  if (refError) return refError;

  let assetId = id;
  if (id) {
    const before = await ctx.db.asset.findUnique({ where: { id }, select: { status: true, villaId: true } });
    if (!before) return { error: "somethingWrong" };
    // Moving to another villa detaches children that stay behind.
    await ctx.db.asset.update({ where: { id }, data });
    if (before.villaId !== data.villaId) {
      await ctx.db.asset.updateMany({ where: { parentId: id, villaId: before.villaId }, data: { parentId: null } });
    }
    if (before.status !== data.status) {
      await ctx.db.assetStatusLog.create({ data: { assetId: id, status: data.status, userId: ctx.user.id } });
    }
  } else {
    const created = await ctx.db.asset.create({ data: { ...data, organizationId: ctx.organization.id } });
    await ctx.db.assetStatusLog.create({ data: { assetId: created.id, status: created.status, userId: ctx.user.id } });
    assetId = created.id;
  }
  revalidatePath("/assets");
  revalidatePath(`/villas/${data.villaId}`);
  redirect(`/assets/${assetId}`);
}

export async function setAssetStatusAction(id: string, status: AssetStatus, note: string) {
  const ctx = await requirePermission("assets.manage");
  const s = enumOf(AssetStatus).parse(status);
  const n = z.string().trim().max(1000).parse(note) || null;
  const asset = await ctx.db.asset.update({ where: { id }, data: { status: s } });
  await ctx.db.assetStatusLog.create({ data: { assetId: id, status: s, note: n, userId: ctx.user.id } });
  revalidatePath(`/assets/${id}`);
  revalidatePath(`/villas/${asset.villaId}`);
}

export async function setAssetArchivedAction(id: string, archived: boolean) {
  const ctx = await requirePermission("assets.manage");
  const asset = await ctx.db.asset.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath(`/villas/${asset.villaId}`);
}
