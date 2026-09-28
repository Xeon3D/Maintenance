"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { prisma } from "@/lib/db/client";
import { assertOwned } from "@/lib/db/tenant";
import { ASSIGNABLE_ROLES } from "@/lib/rbac";
import { LOCALES } from "@/i18n/config";
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
  name: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().length(3).toUpperCase(),
  defaultLocale: z.enum(LOCALES),
});

export async function updateOrgAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePermission("org.manage");
  const parsed = orgSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "somethingWrong" };
  // Organization isn't a tenant-scoped model; scope by id explicitly.
  await prisma.organization.update({ where: { id: ctx.organization.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Users & invitations

const inviteSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  role: z.enum(ASSIGNABLE_ROLES as [Role, ...Role[]]),
  clientId: z.string().optional().transform((v) => v || null),
});

export async function inviteUserAction(_: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePermission("users.manage");
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "somethingWrong" };
  const { email, role } = parsed.data;
  const clientId = role === "REQUESTER" ? parsed.data.clientId : null;
  await assertOwned(ctx.db, "client", [clientId]);

  const token = randomBytes(24).toString("base64url");
  await ctx.db.invitation.create({
    data: {
      organizationId: ctx.organization.id,
      email,
      role,
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
  const vars = { inviter: ctx.user.name, org: ctx.organization.name, role: t(`roles.${role}`) };
  const mail = emailLayout({
    org: ctx.organization.name,
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

export async function updateMemberAction(membershipId: string, data: { role?: Role; active?: boolean }) {
  const ctx = await requirePermission("users.manage");
  const m = await ctx.db.membership.findUnique({ where: { id: membershipId } });
  if (!m || m.role === "OWNER" || m.userId === ctx.user.id) throw new Error("Forbidden");
  const role = data.role && ASSIGNABLE_ROLES.includes(data.role) ? data.role : undefined;
  await ctx.db.membership.update({
    where: { id: membershipId },
    data: { role, active: typeof data.active === "boolean" ? data.active : undefined },
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
