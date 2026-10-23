"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requirePermission } from "@/lib/context";
import { prisma } from "@/lib/db/client";
import { optNumber, parseForm, str, type FormResult } from "@/lib/forms";
import { RATED_ROLES, type RoleRates } from "@/lib/roles";
import { builtInRoleToStore, customRoleToStore, EDITABLE_ROLES, GRANTABLE, isEditableRole, parseRolePermissions, rolePermissionsFor, type RolePermissions } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";
import { audit, changesOf } from "@/lib/audit";

const rate = () => optNumber().refine((v) => v === null || (v >= 0 && v <= 100_000), "invalid");

/**
 * Saves the roles list: the cost per hour of every role, and the names of the roles the company created
 * (fields "rate.<role or id>" and "name.<id>").
 */
export async function saveRolesAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("users.manage");
  const jobRoles = await ctx.db.jobRole.findMany({ select: { id: true, name: true, hourlyRate: true } });
  const parsed = parseForm(
    z.object({
      ...Object.fromEntries(RATED_ROLES.map((r) => [`rate.${r}`, rate()])),
      ...Object.fromEntries(jobRoles.flatMap((j) => [[`rate.${j.id}`, rate()], [`name.${j.id}`, str(60)]])),
    }),
    form,
  );
  if (parsed.error) return parsed.error;
  const data = parsed.data as Record<string, string | number | null>;

  const names = jobRoles.map((j) => ({ ...j, next: data[`name.${j.id}`] as string }));
  const taken = names.filter((j, i) => names.some((o, k) => k !== i && o.next.toLowerCase() === j.next.toLowerCase()));
  if (taken.length) return { error: "validation", fieldErrors: Object.fromEntries(taken.map((j) => [`name.${j.id}`, "roleNameTaken"])) };

  const rates: RoleRates = {};
  for (const r of RATED_ROLES) {
    const v = data[`rate.${r}`] as number | null;
    if (v !== null) rates[r] = v;
  }
  // Organization isn't a tenant-scoped model; scope by id explicitly.
  await prisma.organization.update({ where: { id: ctx.organization.id }, data: { roleRates: rates } });
  const { changes } = changesOf({ roleRates: ctx.organization.roleRates }, { roleRates: rates });
  if (Object.keys(changes).length) await audit(ctx, "organization.roleRates", "Organization", ctx.organization.id, { changes });

  for (const j of names) {
    const hourlyRate = data[`rate.${j.id}`] as number | null;
    const changed = j.next !== j.name || (hourlyRate === null ? j.hourlyRate !== null : Number(j.hourlyRate) !== hourlyRate);
    if (changed) await ctx.db.jobRole.update({ where: { id: j.id }, data: { name: j.next, hourlyRate } });
  }
  revalidatePath("/settings", "layout");
  return { ok: true };
}

const jobRoleSchema = z.object({ name: str(60), hourlyRate: rate() });

/**
 * Creates a role. It starts with the technician's permissions (change them from its Permissions page) and then
 * works like any other role.
 */
export async function createJobRoleAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("users.manage");
  const parsed = parseForm(jobRoleSchema, form);
  if (parsed.error) return parsed.error;
  const clash = await ctx.db.jobRole.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (clash) return { error: "validation", fieldErrors: { name: "roleNameTaken" } };
  await ctx.db.jobRole.create({ data: { ...parsed.data, access: "TECHNICIAN", organizationId: ctx.organization.id } });
  revalidatePath("/settings", "layout");
  return { ok: true };
}

/** Deletes a role the company created; its people go back to the role it was based on (usually Technician). */
export async function deleteJobRoleAction(id: string) {
  const ctx = await requirePermission("users.manage");
  await ctx.db.jobRole.deleteMany({ where: { id } });
  revalidatePath("/settings", "layout");
}

// ── Permissions (Super Admin only)

/** Logs what each built-in role gained and lost (custom roles are logged by the audit trail as JobRole changes). */
async function auditPermissionChanges(ctx: Awaited<ReturnType<typeof requireOwner>>, before: RolePermissions, after: RolePermissions) {
  const roles: Record<string, { added: string[]; removed: string[] }> = {};
  for (const r of EDITABLE_ROLES) {
    const was = rolePermissionsFor(r, before);
    const now = rolePermissionsFor(r, after);
    const added = now.filter((p) => !was.includes(p));
    const removed = was.filter((p) => !now.includes(p));
    if (added.length || removed.length) roles[r] = { added, removed };
  }
  if (Object.keys(roles).length) await audit(ctx, "organization.permissions", "Organization", ctx.organization.id, { roles });
}

/**
 * Saves one role's permissions (Settings → Roles → Permissions). `key` is a built-in staff role or a custom role's id;
 * checkboxes are named "perm". A list equal to the default (or, for a custom role, to its access level) is stored as
 * "no override", so the role keeps following it.
 */
export async function saveRolePermissionsAction(key: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requireOwner();
  const submitted = GRANTABLE.filter((p) => form.getAll("perm").includes(p));
  const before = parseRolePermissions(ctx.organization.rolePermissions);

  if (isEditableRole(key)) {
    const after: RolePermissions = { ...before };
    delete after[key];
    const list = builtInRoleToStore(key, submitted);
    if (list) after[key] = list;
    // Organization isn't a tenant-scoped model; scope by id explicitly.
    await prisma.organization.update({ where: { id: ctx.organization.id }, data: { rolePermissions: Object.keys(after).length ? after : Prisma.DbNull } });
    await auditPermissionChanges(ctx, before, after);
  } else {
    const j = await ctx.db.jobRole.findFirst({ where: { id: key }, select: { id: true, access: true, permissions: true } });
    if (!j || !isEditableRole(j.access)) return { error: "somethingWrong" };
    const level = rolePermissionsFor(j.access, before);
    const list = customRoleToStore(j.permissions, submitted, level, level);
    await ctx.db.jobRole.update({ where: { id: j.id }, data: { permissions: list ?? Prisma.DbNull } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Puts one role back to the default permissions (a custom role: back to following its access level). */
export async function resetRolePermissionsAction(key: string) {
  const ctx = await requireOwner();
  if (isEditableRole(key)) {
    const before = parseRolePermissions(ctx.organization.rolePermissions);
    const after: RolePermissions = { ...before };
    delete after[key];
    await prisma.organization.update({ where: { id: ctx.organization.id }, data: { rolePermissions: Object.keys(after).length ? after : Prisma.DbNull } });
    await auditPermissionChanges(ctx, before, after);
  } else {
    await ctx.db.jobRole.updateMany({ where: { id: key }, data: { permissions: Prisma.DbNull } });
  }
  revalidatePath("/", "layout");
}
