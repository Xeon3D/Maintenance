import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { villaAssetChoices } from "@/lib/knowledge-select";
import { ArticleForm } from "../article-form";

export const generateMetadata = titled("knowledge.new");

export default async function NewArticlePage({ params, searchParams }: PageProps<"/villas/[id]/knowledge/new">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("knowledge.manage")) notFound();
  const villa = await ctx.db.villa.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!villa) notFound();
  const assets = await villaAssetChoices(ctx.db, id);
  const assetId = sp(await searchParams, "assetId");
  const from = assets.find((a) => a.id === assetId);
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/villas/${id}/knowledge`} label={t("knowledge.title")} />
      <PageHeader title={t("knowledge.new")} description={villa.name} />
      <Card className="max-w-3xl p-6">
        <ArticleForm villaId={id} assets={assets} defaults={from && { assetId: from.id, system: from.system }} />
      </Card>
    </>
  );
}
