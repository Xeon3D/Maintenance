import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { AssetForm } from "../../asset-form";

export default async function EditAssetPage({ params }: PageProps<"/assets/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("assets.manage")) notFound();
  const asset = await ctx.db.asset.findUnique({ where: { id }, omit: { credentialsEnc: true } });
  if (!asset) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/assets/${id}`} label={asset.name} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-4xl p-6">
        <AssetForm ctx={ctx} asset={{ ...asset, purchaseCost: asset.purchaseCost?.toString() ?? null }} />
      </Card>
    </>
  );
}
