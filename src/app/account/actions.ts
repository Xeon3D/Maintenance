"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/context";
import { prisma } from "@/lib/db/client";
import { optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { clearResetTokens } from "@/lib/password-reset";
import { sendPush } from "@/lib/push";
import { NOTIFICATION_TYPES, type Channels, type NotificationType } from "@/lib/notification-types";

// Personal settings for any signed-in user (staff or client portal); nothing here is org-scoped.

const profileSchema = z.object({ name: str(100), phone: optStr(50) });

export async function updateProfileAction(_: FormResult, form: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseForm(profileSchema, form);
  if (parsed.error) return parsed.error;
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z
  .object({ current: z.string().max(200), password: z.string().min(8).max(200), confirm: z.string().max(200) })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordMismatch" });

export async function changePasswordAction(_: FormResult, form: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = parseForm(passwordSchema, form);
  if (parsed.error) return parsed.error;
  if (user.passwordHash && !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { error: "validation", fieldErrors: { current: "wrongPassword" } };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  await clearResetTokens(user.id);
  return { ok: true };
}

const channels = z.object({ email: z.boolean(), push: z.boolean() });

export async function savePrefsAction(prefs: Partial<Record<NotificationType, Channels>>) {
  const user = await requireUser();
  const clean: Partial<Record<NotificationType, Channels>> = {};
  for (const type of NOTIFICATION_TYPES) {
    const c = channels.safeParse(prefs[type]);
    if (c.success) clean[type] = c.data;
  }
  const current = user.notificationPrefs && typeof user.notificationPrefs === "object" ? (user.notificationPrefs as Record<string, Channels>) : {};
  await prisma.user.update({ where: { id: user.id }, data: { notificationPrefs: { ...current, ...clean } } });
  return { ok: true };
}

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://")),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Registers this browser for push. An endpoint belongs to whoever subscribed on it last. */
export async function subscribePushAction(sub: unknown, userAgent: string) {
  const user = await requireUser();
  const s = subscriptionSchema.parse(sub);
  const data = { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: userAgent.slice(0, 300) };
  await prisma.pushSubscription.upsert({ where: { endpoint: s.endpoint }, create: { endpoint: s.endpoint, ...data }, update: data });
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string) {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}

export async function testPushAction(title: string, body: string) {
  const user = await requireUser();
  await sendPush(user.id, { title: title.slice(0, 100), body: body.slice(0, 200), url: "/", tag: "test" });
  return { ok: true };
}
