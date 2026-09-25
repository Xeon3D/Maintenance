"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { enumOf, optId, optNumber, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { AreaKind } from "@/generated/prisma/enums";

const villaSchema = z.object({
  clientId: str(40),
  name: str(150),
  code: optStr(30),
  address: optStr(300),
  city: optStr(100),
  country: optStr(100),
  latitude: optNumber().refine((v) => v === null || Math.abs(v) <= 90),
  longitude: optNumber().refine((v) => v === null || Math.abs(v) <= 180),
  accessNotes: optStr(5000),
});

export async function saveVillaAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("clients.manage");
  const parsed = parseForm(villaSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;
  await assertOwned(ctx.db, "client", [data.clientId]);

  let villaId = id;
  if (id) {
    await ctx.db.villa.update({ where: { id }, data });
  } else {
    villaId = (await ctx.db.villa.create({ data: { ...data, organizationId: ctx.organization.id } })).id;
  }
  revalidatePath("/villas");
  redirect(`/villas/${villaId}`);
}

export async function setVillaArchivedAction(id: string, archived: boolean) {
  const ctx = await requirePermission("clients.manage");
  await ctx.db.villa.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/villas");
  revalidatePath(`/villas/${id}`);
}

// ── Areas (floors / rooms / zones)

const areaSchema = z.object({
  name: str(100),
  kind: enumOf(AreaKind),
  parentId: optId(),
});

export async function addAreaAction(villaId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("assets.manage");
  await assertOwned(ctx.db, "villa", [villaId]);
  const parsed = parseForm(areaSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;
  if (data.parentId) {
    const parent = await ctx.db.area.findFirst({ where: { id: data.parentId, villaId } });
    if (!parent) return { error: "somethingWrong" };
  }
  await ctx.db.area.create({ data: { ...data, villaId, organizationId: ctx.organization.id } });
  revalidatePath(`/villas/${villaId}`);
  return { ok: true };
}

export async function renameAreaAction(areaId: string, name: string) {
  const ctx = await requirePermission("assets.manage");
  const clean = z.string().trim().min(1).max(100).parse(name);
  const area = await ctx.db.area.update({ where: { id: areaId }, data: { name: clean } });
  revalidatePath(`/villas/${area.villaId}`);
}

export async function deleteAreaAction(areaId: string) {
  const ctx = await requirePermission("assets.manage");
  const area = await ctx.db.area.delete({ where: { id: areaId } });
  revalidatePath(`/villas/${area.villaId}`);
}
