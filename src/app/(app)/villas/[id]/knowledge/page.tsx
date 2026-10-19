import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/list-controls";
import { ArticleList } from "@/components/knowledge/article-list";
import { getContext } from "@/lib/context";
import { filterArticles } from "@/lib/knowledge";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { SystemType } from "@/generated/prisma/enums";
import { ARTICLE_LIST_SELECT, listedArticle } from "@/lib/knowledge-select";

export const generateMetadata = titled("knowledge.title");

export default async function VillaKnowledgePage({ params, searchParams }: PageProps<"/villas/[id]/knowledge">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const query = await searchParams;
  const q = sp(query, "q");
  const systemParam = sp(query, "system");
  const system = systemParam && systemParam in SystemType ? (systemParam as SystemType) : null;
  const assetId = sp(query, "assetId") ?? null;

  const villa = await ctx.db.villa.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!villa) notFound();
  const rows = await ctx.db.knowledgeArticle.findMany({ where: { villaId: id }, select: ARTICLE_LIST_SELECT });
  const articles = rows.map(listedArticle);
  const matches = filterArticles(articles, { q, system, assetId });

  // Only the systems and assets that have articles are worth offering as filters.
  const systems = Object.values(SystemType).filter((s) => articles.some((a) => a.system === s));
  const assets = [...new Map(articles.flatMap((a) => a.assets).map((x) => [x.id, x])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const canManage = ctx.can("knowledge.manage");
  const filtered = !!(q || system || assetId);

  return (
    <>
      <BackLink href={`/villas/${villa.id}`} label={villa.name} />
      <PageHeader
        title={t("knowledge.title")}
        description={t("knowledge.description")}
        actions={
          canManage && (
            <Link href={`/villas/${villa.id}/knowledge/new`}>
              <Button>
                <Plus className="size-4" />
                {t("knowledge.new")}
              </Button>
            </Link>
          )
        }
      />
      {articles.length === 0 ? (
        <EmptyState
          title={t("knowledge.empty")}
          description={t("knowledge.emptyHint")}
          action={
            canManage && (
              <Link href={`/villas/${villa.id}/knowledge/new`}>
                <Button>
                  <Plus className="size-4" />
                  {t("knowledge.new")}
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <FilterBar searchPlaceholder={t("knowledge.searchPlaceholder")}>
            {systems.length > 0 && (
              <Select name="system" defaultValue={system ?? ""}>
                <option value="">{t("knowledge.allSystems")}</option>
                {systems.map((s) => (
                  <option key={s} value={s}>
                    {t(`systems.${s}`)}
                  </option>
                ))}
              </Select>
            )}
            {assets.length > 0 && (
              <Select name="assetId" defaultValue={assetId ?? ""}>
                <option value="">{t("knowledge.allAssets")}</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </FilterBar>
          <Card>
            {matches.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">{t("knowledge.noMatches")}</p>
            ) : (
              <ArticleList matches={matches} hrefFor={(a) => `/villas/${villa.id}/knowledge/${a}`} />
            )}
          </Card>
          {filtered && matches.length > 0 && <p className="mt-2 text-xs text-muted">{t("knowledge.found", { count: matches.length })}</p>}
        </>
      )}
    </>
  );
}
