"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { prisma } from "@/lib/db/client";
import { optNumber, parseForm, str, type FormResult } from "@/lib/forms";
import { CUSTOM_ROLE_ACCESS, RATED_ROLES, type RoleRates } from "@/lib/roles";

const rate = () => optNumber().refine((v) => v === null || (v >= 0 && v <= 100_000), "invalid");

/** Cost per hour of the built-in staff roles. */
export async function saveRoleRatesAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("users.manage");
  const parsed = parseForm(z.object(Object.fromEntries(RATED_ROLES.map((r) => [r, rate()]))), form);
  if (parsed.error) return parsed.error;
  const rates: RoleRates = {};
  for (const r of RATED_ROLES) {
    const v = (parsed.data as Record<string, number | null>)[r];
    if (v !== null) rates[r] = v;
  }
  // Organization isn't a tenant-scoped model; scope by id explicitly.
  await prisma.organization.update({ where: { id: ctx.organization.id }, data: { roleRates: rates } });
  revalidatePath("/settings", "layout");
  return { ok: true };
}

const jobRoleSchema = z.object({
  name: str(60),
  access: z.enum(CUSTOM_ROLE_ACCESS),
  hourlyRate: rate(),
});

/** Creates or edits a custom role. Changing its access level updates everyone in it. */
export async function saveJobRoleAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("users.manage");
  const parsed = parseForm(jobRoleSchema, form);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const clash = await ctx.db.jobRole.findFirst({ where: { name: { equals: data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: "validation", fieldErrors: { name: "roleNameTaken" } };

  if (id) {
    const before = await ctx.db.jobRole.findFirst({ where: { id } });
    if (!before) return { error: "somethingWrong" };
    await ctx.db.jobRole.update({ where: { id }, data });
    if (before.access !== data.access) {
      await ctx.db.membership.updateMany({ where: { jobRoleId: id, role: { not: "OWNER" } }, data: { role: data.access } });
      await ctx.db.invitation.updateMany({ where: { jobRoleId: id, acceptedAt: null }, data: { role: data.access } });
    }
  } else {
    await ctx.db.jobRole.create({ data: { ...data, organizationId: ctx.organization.id } });
  }
  revalidatePath("/settings", "layout");
  return { ok: true };
}

/** Deletes a custom role; its members keep the same access level under the built-in role. */
export async function deleteJobRoleAction(id: string) {
  const ctx = await requirePermission("users.manage");
  await ctx.db.jobRole.deleteMany({ where: { id } });
  revalidatePath("/settings", "layout");
}
