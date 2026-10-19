import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { titled } from "@/lib/metadata";
import { villaAssetChoices } from "@/lib/knowledge-select";
import { ArticleForm } from "../../article-form";
import { deleteArticleAction } from "../../actions";
import { DeleteArticleButton } from "../../delete-button";

export const generateMetadata = titled("knowledge.edit");

export default async function EditArticlePage({ params }: PageProps<"/villas/[id]/knowledge/[articleId]/edit">) {
  const { id, articleId } = await params;
  const ctx = await getContext();
  if (!ctx.can("knowledge.manage")) notFound();
  const article = await ctx.db.knowledgeArticle.findFirst({
    where: { id: articleId, villaId: id },
    select: { id: true, title: true, body: true, system: true, pinned: true, assets: { select: { id: true } } },
  });
  if (!article) notFound();
  const assets = await villaAssetChoices(ctx.db, id, article.assets.map((a) => a.id));
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/villas/${id}/knowledge/${articleId}`} label={article.title} />
      <PageHeader
        title={t("knowledge.edit")}
        actions={<DeleteArticleButton action={deleteArticleAction.bind(null, id, articleId)} />}
      />
      <Card className="max-w-3xl p-6">
        <ArticleForm villaId={id} article={article} assets={assets} />
      </Card>
    </>
  );
}
