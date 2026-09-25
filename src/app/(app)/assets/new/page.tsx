import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { AssetForm } from "../asset-form";

export default async function NewAssetPage({ searchParams }: PageProps<"/assets/new">) {
  const ctx = await getContext();
  if (!ctx.can("assets.manage")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const villaId = sp(params, "villaId");
  const parentId = sp(params, "parentId");
  // Pre-fill system from the parent when adding a child (e.g. switch inside a rack).
  const parent = parentId ? await ctx.db.asset.findUnique({ where: { id: parentId }, select: { villaId: true, areaId: true, system: true } }) : null;

  return (
    <>
      <BackLink href={villaId ? `/villas/${villaId}` : "/assets"} label={t("nav.assets")} />
      <PageHeader title={t("assets.new")} />
      <Card className="max-w-4xl p-6">
        <AssetForm
          ctx={ctx}
          asset={{
            villaId: parent?.villaId ?? villaId,
            areaId: parent?.areaId,
            parentId: parent ? parentId : undefined,
            system: parent?.system,
          }}
        />
      </Card>
    </>
  );
}
