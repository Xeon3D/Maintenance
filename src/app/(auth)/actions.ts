"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db/client";
import { createOrganization } from "@/lib/org";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/context";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export type FormState = { error?: string } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: safeNext(form.get("next")),
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "invalidCredentials" };
    throw e; // NEXT_REDIRECT on success
  }
}

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().max(100).optional(),
  email: z.email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8).max(200),
  next: z.string().optional(),
});

/** Creates a user. With a company name it also creates their organization (owner sign-up);
 *  without one (invitation flow) the user joins via the invite page afterwards. */
export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "passwordRule" };
  const { name, company, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) return { error: "emailTaken" };

  const locale = await getLocale();
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), locale: isLocale(locale) ? locale : "en" },
  });
  if (company) {
    const org = await createOrganization(user.id, company, isLocale(locale) ? locale : "en");
    (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, { path: "/", httpOnly: true, sameSite: "lax" });
  }

  await signIn("credentials", { email, password, redirectTo: safeNext(form.get("next")) });
}

export async function createOrgAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(100).safeParse(form.get("company"));
  if (!name.success) return { error: "somethingWrong" };
  const org = await createOrganization(user.id, name.data, isLocale(user.locale) ? user.locale : "en");
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const session = await auth();
  if (session?.user?.id) await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
}

export async function switchOrgAction(organizationId: string) {
  const user = await requireUser();
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
  });
  if (!m?.active) return;
  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/dashboard");
}
