import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { TermsNotice } from "@/components/terms-notice";
import { getTheme } from "@/lib/theme-server";
import { prisma } from "@/lib/db/client";
import { brandStyle } from "@/lib/branding";

// Public: linked from sign-in and usable as the "terms of service" link of an OAuth app registration.
const orgBySlug = (slug: string) => prisma.organization.findUnique({ where: { slug } });

export async function generateMetadata({ params }: PageProps<"/terms/[slug]">): Promise<Metadata> {
  const t = await getTranslations("terms");
  const org = await orgBySlug((await params).slug);
  return { title: org ? `${t("title")} · ${org.name}` : t("title") };
}

export default async function TermsPage({ params }: PageProps<"/terms/[slug]">) {
  const org = await orgBySlug((await params).slug);
  if (!org) notFound();
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8" style={brandStyle(org)}>
      <TermsNotice org={org} />
      <div className="mt-4 flex justify-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle initial={await getTheme()} />
      </div>
    </div>
  );
}
