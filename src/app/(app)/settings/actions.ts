"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { prisma } from "@/lib/db/client";
import { assertOwned } from "@/lib/db/tenant";
import { ASSIGNABLE_ROLES } from "@/lib/rbac";
import { LOCALES } from "@/i18n/config";
import { optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { brandColor, contrastWithWhite, logoSrc, MIN_CONTRAST, normalizeHex } from "@/lib/branding";
import { deleteObject, putObject } from "@/lib/storage";
import { Role, SystemType } from "@/generated/prisma/enums";
import { getLocale } from "next-intl/server";
import { createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import pt from "../../../../messages/pt.json";
import { appOrigin } from "@/lib/qr";
import { emailLayout, sendEmail } from "@/lib/email";
import { background } from "@/lib/notify";

export type ActionState = { ok?: boolean; error?: string; inviteUrl?: string; inviteEmail?: string } | undefined;

// ── Organization

const orgSchema = z.object({
  name: str(100),
  legalName: optStr(200),
  taxId: optStr(40),
  email: optStr(200).refine((v) => v === null || z.email().safeParse(v).success, "invalid_format"),
  phone: optStr(50),
  // Printed and linked on documents, so only http(s).
  website: optStr(300).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "invalid_url"),
  address: optStr(500),
  brandColor: optStr(7).refine((v) => v === null || normalizeHex(v) !== null, "invalid_color").refine(
    (v) => v === null || contrastWithWhite(normalizeHex(v)!) >= MIN_CONTRAST,
    "brandTooLight",
  ),
  reportFooter: optStr(500),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().length(3).toUpperCase(),
  defaultLocale: z.enum(LOCALES),
});

export async function updateOrgAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("org.manage");
  const parsed = parseForm(orgSchema, form);
  if (parsed.error) return parsed.error;
  const data = { ...parsed.data, brandColor: normalizeHex(parsed.data.brandColor) };
  // Organization isn't a tenant-scoped model; scope by id explicitly.
  await prisma.organization.update({ where: { id: ctx.organization.id }, data });
  revalidatePath("/", "layout");
  return { ok: true };
}

const LOGO_MAX = 2 * 1024 * 1024;

/** Detects PNG/JPEG from the bytes themselves (the browser's declared type isn't trusted). */
function imageExt(buf: Buffer) {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  return null;
}

/** Replaces the company logo (PNG or JPEG up to 2 MB; SVG isn't accepted: it can carry script and PDFs can't embed it). */
export async function uploadLogoAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("org.manage");
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "validation", fieldErrors: { logo: "too_small" } };
  if (file.size > LOGO_MAX) return { error: "validation", fieldErrors: { logo: "logoTooLarge" } };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = imageExt(buf);
  if (!ext) return { error: "validation", fieldErrors: { logo: "logoType" } };

  const ref = await putObject(`${ctx.organization.id}/branding/logo-${randomBytes(6).toString("hex")}.${ext}`, buf);
  const previous = ctx.organization.logoUrl;
  await prisma.organization.update({ where: { id: ctx.organization.id }, data: { logoUrl: ref } });
  if (previous) await deleteObject(previous).catch(() => undefined);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeLogoAction() {
  const ctx = await requirePermission("org.manage");
  const previous = ctx.organization.logoUrl;
  await prisma.organization.update({ where: { id: ctx.organization.id }, data: { logoUrl: null } });
  if (previous) await deleteObject(previous).catch(() => undefined);
  revalidatePath("/", "layout");
}

// ── Users & invitations

const inviteSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  role: z.string().max(60), // a built-in role, or "job:<id>" for a custom role
  clientId: z.string().optional().transform((v) => v || null),
});

type Ctx = Awaited<ReturnType<typeof requirePermission>>;

/** A role choice from the forms: a built-in role, or "job:<id>" (custom role → its access level). */
async function resolveRoleChoice(ctx: Ctx, choice: string): Promise<{ role: Role; jobRoleId: string | null }> {
  if (choice.startsWith("job:")) {
    const jobRole = await ctx.db.jobRole.findFirst({ where: { id: choice.slice(4) }, select: { id: true, access: true } });
    if (!jobRole) throw new Error("Invalid role");
    return { role: jobRole.access, jobRoleId: jobRole.id };
  }
  if (!ASSIGNABLE_ROLES.includes(choice as Role)) throw new Error("Invalid role");
  return { role: choice as Role, jobRoleId: null };
}

export async function inviteUserAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePermission("users.manage");
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "somethingWrong" };
  const { email } = parsed.data;
  const { role, jobRoleId } = await resolveRoleChoice(ctx, parsed.data.role).catch(() => ({ role: null, jobRoleId: null }));
  if (!role) return { error: "somethingWrong" };
  const clientId = role === "REQUESTER" ? parsed.data.clientId : null;
  await assertOwned(ctx.db, "client", [clientId]);

  const token = randomBytes(24).toString("base64url");
  await ctx.db.invitation.create({
    data: {
      organizationId: ctx.organization.id,
      email,
      role,
      jobRoleId,
      clientId,
      token,
      invitedById: ctx.user.id,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  });
  revalidatePath("/settings/users");

  // Emailed in the inviter's current language; the link is also shown so it can be shared directly.
  const locale = await getLocale();
  const t = createTranslator({ locale, messages: locale === "pt" ? pt : en });
  const url = `${await appOrigin()}/invite/${token}`;
  const roleLabel = jobRoleId ? (await ctx.db.jobRole.findFirst({ where: { id: jobRoleId }, select: { name: true } }))!.name : t(`roles.${role}`);
  const vars = { inviter: ctx.user.name, org: ctx.organization.name, role: roleLabel };
  const mail = emailLayout({
    org: ctx.organization.name,
    logo: logoSrc(ctx.organization, await appOrigin()),
    color: brandColor(ctx.organization),
    heading: t("email.inviteSubject", vars),
    paragraphs: [t("email.inviteBody", vars)],
    cta: { label: t("email.inviteCta"), url },
  });
  background(() => sendEmail({ to: email, subject: t("email.inviteSubject", vars), ...mail }));
  return { ok: true, inviteUrl: `/invite/${token}`, inviteEmail: email };
}

export async function revokeInviteAction(id: string) {
  const ctx = await requirePermission("users.manage");
  await ctx.db.invitation.deleteMany({ where: { id, acceptedAt: null } });
  revalidatePath("/settings/users");
}

export async function updateMemberAction(membershipId: string, data: { role?: string; active?: boolean }) {
  const ctx = await requirePermission("users.manage");
  const m = await ctx.db.membership.findUnique({ where: { id: membershipId } });
  if (!m || m.role === "OWNER" || m.userId === ctx.user.id) throw new Error("Forbidden");
  const choice = data.role ? await resolveRoleChoice(ctx, data.role) : null;
  await ctx.db.membership.update({
    where: { id: membershipId },
    data: {
      ...(choice ? { role: choice.role, jobRoleId: choice.jobRoleId, clientId: choice.role === "REQUESTER" ? m.clientId : null } : {}),
      active: typeof data.active === "boolean" ? data.active : undefined,
    },
  });
  revalidatePath("/settings/users");
}

// ── Teams

const teamSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  system: z
    .enum(Object.values(SystemType) as [SystemType, ...SystemType[]])
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function createTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePermission("teams.manage");
  const parsed = teamSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "somethingWrong" };
  await ctx.db.team.create({
    data: { organizationId: ctx.organization.id, ...parsed.data, system: parsed.data.system ?? null },
  });
  revalidatePath("/settings/teams");
  return { ok: true };
}

export async function deleteTeamAction(teamId: string) {
  const ctx = await requirePermission("teams.manage");
  await ctx.db.team.delete({ where: { id: teamId } });
  revalidatePath("/settings/teams");
}

async function assertMember(ctx: Awaited<ReturnType<typeof requirePermission>>, userId: string) {
  const m = await ctx.db.membership.findFirst({ where: { userId } });
  if (!m) throw new Error("Invalid user");
}

export async function addTeamMemberAction(teamId: string, userId: string) {
  const ctx = await requirePermission("teams.manage");
  await assertOwned(ctx.db, "team", [teamId]);
  await assertMember(ctx, userId);
  await ctx.db.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });
  revalidatePath("/settings/teams");
}

export async function removeTeamMemberAction(teamId: string, userId: string) {
  const ctx = await requirePermission("teams.manage");
  await assertOwned(ctx.db, "team", [teamId]);
  await ctx.db.teamMember.deleteMany({ where: { teamId, userId } });
  revalidatePath("/settings/teams");
}
