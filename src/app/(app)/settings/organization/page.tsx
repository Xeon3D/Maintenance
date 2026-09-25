import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/context";
import { OrgForm } from "./form";

export default async function OrgSettingsPage() {
  const ctx = await getContext();
  if (!ctx.can("org.manage")) notFound();
  const t = await getTranslations("settings");
  const o = ctx.organization;
  return (
    <>
      <PageHeader title={t("orgTitle")} description={t("orgDescription")} />
      <Card className="max-w-xl p-6">
        <OrgForm org={{ name: o.name, timezone: o.timezone, currency: o.currency, defaultLocale: o.defaultLocale }} />
      </Card>
    </>
  );
}
