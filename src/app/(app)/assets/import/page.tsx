import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { TEMPLATE_COLUMNS } from "./plan";
import { Importer } from "./importer";

export default async function ImportPage() {
  const ctx = await getContext();
  if (!ctx.can("assets.manage")) notFound();
  const t = await getTranslations();
  const villas = await ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true } });

  return (
    <>
      <BackLink href="/assets" label={t("nav.assets")} />
      <PageHeader title={t("import.title")} description={t("import.description")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <Importer villas={Object.fromEntries(villas.map((v) => [v.id, v.name]))} />
        </Card>
        <Card className="space-y-3 p-5 text-sm">
          <h2 className="font-medium">{t("import.formatTitle")}</h2>
          <p className="text-muted">{t("import.formatHelp")}</p>
          <p className="font-mono text-xs leading-relaxed">{TEMPLATE_COLUMNS.join(", ")}</p>
          <p className="text-muted">{t("import.requiredHelp")}</p>
          <Link href="/assets/import/template" prefetch={false} className="inline-flex items-center gap-1 font-medium text-brand">
            <Download className="size-4" />
            {t("import.template")}
          </Link>
        </Card>
      </div>
    </>
  );
}
