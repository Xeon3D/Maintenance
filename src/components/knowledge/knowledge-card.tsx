import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { ArticleList } from "@/components/knowledge/article-list";
import type { AppContext } from "@/lib/context";
import { filterArticles } from "@/lib/knowledge";
import { ARTICLE_LIST_SELECT, listedArticle } from "@/lib/knowledge-select";

const SHOWN = 5;

/** The villa page / asset page card: pinned and latest articles, with links to the rest and to write one. */
export async function KnowledgeCard({ ctx, villaId, assetId }: { ctx: AppContext; villaId: string; assetId?: string }) {
  const t = await getTranslations("knowledge");
  const rows = await ctx.db.knowledgeArticle.findMany({
    where: { villaId, ...(assetId ? { assets: { some: { id: assetId } } } : {}) },
    select: ARTICLE_LIST_SELECT,
  });
  // On an asset page, an asset with nothing written about it doesn't need the card (unless one can write).
  const canManage = ctx.can("knowledge.manage");
  if (assetId && rows.length === 0 && !canManage) return null;
  const matches = filterArticles(rows.map(listedArticle)).slice(0, SHOWN);
  const base = `/villas/${villaId}/knowledge`;
  const all = assetId ? `${base}?assetId=${assetId}` : base;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="inline-flex items-center gap-2 font-medium">
          <BookOpen className="size-4 text-muted" />
          {t("title")}
          {rows.length > 0 && <span className="text-sm font-normal text-muted">{rows.length}</span>}
        </h2>
        <div className="flex gap-3 text-sm">
          {canManage && (
            <Link href={`${base}/new${assetId ? `?assetId=${assetId}` : ""}`} className="inline-flex items-center gap-1 text-muted hover:text-brand">
              <Plus className="size-4" />
              {t("new")}
            </Link>
          )}
          {rows.length > 0 && (
            <Link href={all} className="text-brand">
              {t("viewAll")}
            </Link>
          )}
        </div>
      </div>
      {matches.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{assetId ? t("emptyAsset") : t("emptyHint")}</p>
      ) : (
        <ArticleList matches={matches} hrefFor={(id) => `${base}/${id}`} compact />
      )}
    </Card>
  );
}
