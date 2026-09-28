import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

const ACTIVE_ORG_COOKIE = "active_org"; // mirrors lib/context (importing it here would pull in redirect logic)
const DEFAULT_TIMEZONE = "Europe/Lisbon";

async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("pt") ? "pt" : DEFAULT_LOCALE;
}

/** Dates render in the active organization's time zone. */
async function resolveTimeZone(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) return DEFAULT_TIMEZONE;
  const orgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const m = await prisma.membership.findFirst({
    where: { userId: session.user.id, active: true, ...(orgId ? { organizationId: orgId } : {}) },
    select: { organization: { select: { timezone: true } } },
    orderBy: { createdAt: "asc" },
  });
  return m?.organization.timezone ?? DEFAULT_TIMEZONE;
}

export default getRequestConfig(async () => {
  const [locale, timeZone] = await Promise.all([resolveLocale(), resolveTimeZone()]);
  return {
    locale,
    timeZone,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
