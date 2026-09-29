import "server-only";
import { after } from "next/server";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { prisma } from "@/lib/db/client";
import type { TenantDb } from "@/lib/db/tenant";
import { PERMISSIONS, type Permission } from "@/lib/rbac";
import { emailLayout, sendEmail } from "@/lib/email";
import { brandColor, logoSrc } from "@/lib/branding";
import { sendPush } from "@/lib/push";
import { NOTIFICATION_DEFAULTS, prefsOf, type NotificationType } from "@/lib/notification-types";
import type { Role } from "@/generated/prisma/enums";

export { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notification-types";

type Data = Record<string, string | number>;
const MESSAGES = { en, pt } as const;

/** Title/body for a notification in a given language (email, push, and the stored fallback). */
export function renderNotification(locale: string, type: NotificationType, data: Data) {
  const t = createTranslator({ locale, messages: MESSAGES[locale === "pt" ? "pt" : "en"], namespace: "notify" });
  const key = (k: string) => `${type}.${k}` as never;
  return {
    title: t(key("title"), data as never),
    body: (t.has(key("body")) && t(key("body"), data as never).trim()) || null,
  };
}

/** Base URL for links in emails and push. APP_URL wins, then the current request's host. */
async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const { appOrigin } = await import("@/lib/qr");
    return await appOrigin();
  } catch {
    return "http://localhost:3000"; // no request (scheduler)
  }
}

/** Runs delivery after the response when there is one (server actions, routes); inline otherwise (jobs). */
export function background(fn: () => Promise<void>) {
  const run = () => fn().catch((e) => console.error("[notify]", e));
  try {
    after(run);
  } catch {
    void run();
  }
}

export type NotifyActor = { organization: { id: string; name: string }; user?: { id: string } | null };

/**
 * Notifies org members: an in-app row (unless the type is push/email-only), plus email and web push
 * according to each user's preferences. The acting user is never notified about their own action.
 */
export async function notify(actor: NotifyActor, userIds: (string | null | undefined)[], n: { type: NotificationType; data: Data; link?: string | null }) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x && x !== actor.user?.id))];
  if (ids.length === 0) return;
  const orgId = actor.organization.id;
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, memberships: { some: { organizationId: orgId, active: true } } },
    select: { id: true, email: true, locale: true, notificationPrefs: true, memberships: { where: { organizationId: orgId }, select: { role: true } } },
  });
  if (users.length === 0) return;

  const defaults = NOTIFICATION_DEFAULTS[n.type];
  if (defaults.inApp) {
    await prisma.notification.createMany({
      data: users.map((u) => {
        const r = renderNotification(u.locale, n.type, n.data);
        return { organizationId: orgId, userId: u.id, type: n.type, title: r.title, body: r.body, link: n.link ?? null, data: n.data };
      }),
    });
  }

  const base = await origin();
  const brand = await orgBrand(orgId, base);
  background(async () => {
    for (const u of users) {
      const prefs = prefsOf(u.notificationPrefs, n.type);
      const r = renderNotification(u.locale, n.type, n.data);
      const url = n.link ? base + n.link : base;
      if (prefs.push) await sendPush(u.id, { title: r.title, body: r.body ?? undefined, url, tag: n.link ?? n.type });
      if (prefs.email) {
        const portal = u.memberships[0]?.role === "REQUESTER";
        await sendEmail({ to: u.email, subject: r.title, ...notificationEmail(u.locale, brand, r, url, `${base}${portal ? "/portal/profile" : "/settings/profile"}`) });
      }
    }
  });
}

type Brand = { org: string; logo: string | null; color: string };

/** Name, absolute logo URL and colour for emails. */
async function orgBrand(orgId: string, base: string): Promise<Brand> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { id: true, name: true, logoUrl: true, updatedAt: true, brandColor: true } });
  return { org: org.name, logo: logoSrc(org, base), color: brandColor(org) };
}

function notificationEmail(locale: string, brand: Brand, r: { title: string; body: string | null }, url: string, settingsUrl: string) {
  const t = createTranslator({ locale, messages: MESSAGES[locale === "pt" ? "pt" : "en"], namespace: "email" });
  return emailLayout({
    ...brand,
    heading: r.title,
    paragraphs: r.body ? [r.body] : [],
    cta: { label: t("open"), url },
    footer: t("footer", { url: settingsUrl }),
  });
}

/** Email to someone without an account (e.g. a QR-form requester). */
export async function notifyExternal(org: { id: string; name: string }, to: string | null | undefined, locale: string, type: NotificationType, data: Data) {
  if (!to) return;
  const brand = await orgBrand(org.id, await origin());
  const r = renderNotification(locale, type, data);
  const t = createTranslator({ locale, messages: MESSAGES[locale === "pt" ? "pt" : "en"], namespace: "email" });
  background(() => sendEmail({ to, subject: r.title, ...emailLayout({ ...brand, heading: r.title, paragraphs: r.body ? [r.body] : [], footer: t("externalFooter") }) }));
}

/** Active members whose role has `permission` (e.g. everyone who can approve requests). */
export async function membersWith(db: TenantDb, permission: Permission, extra: { excludeRoles?: Role[] } = {}) {
  const roles = (PERMISSIONS[permission] as readonly Role[]).filter((r) => !extra.excludeRoles?.includes(r));
  const rows = await db.membership.findMany({ where: { active: true, role: { in: roles } }, select: { userId: true } });
  return rows.map((r) => r.userId);
}
