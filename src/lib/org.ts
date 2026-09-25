import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import type { Locale } from "@/i18n/config";

const TRIAL_DAYS = 14;

function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

/** Creates an organization with `userId` as OWNER, a trial subscription and a main warehouse. */
export async function createOrganization(userId: string, name: string, locale: Locale) {
  return prisma.organization.create({
    data: {
      name,
      slug: slugify(name),
      defaultLocale: locale,
      memberships: { create: { userId, role: "OWNER" } },
      subscription: {
        create: { status: "TRIALING", trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) },
      },
      stockLocations: { create: { name: locale === "pt" ? "Armazém principal" : "Main warehouse", type: "WAREHOUSE" } },
    },
  });
}
