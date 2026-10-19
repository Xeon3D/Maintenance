import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { PageHeader, Select } from "@/components/ui";
import { FilterBar } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { SearchResults } from "@/components/search-results";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { searchWorkOrders } from "@/lib/search";
import { searchArticles } from "@/lib/knowledge-search";
import { ArticleResults } from "@/components/knowledge/article-results";
import { SystemType } from "@/generated/prisma/enums";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("nav.search");

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const raw = await searchParams;
  const q = (sp(raw, "q") ?? "").slice(0, 200);
  const villaId = sp(raw, "villa");
  const systemParam = sp(raw, "system");
  const system = Object.values(SystemType).find((s) => s === systemParam);

  const [villas, found, articles] = await Promise.all([
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    searchWorkOrders(ctx.db, ctx.organization.id, q, { villaId, system }),
    searchArticles(ctx.db, q, { villaId, system }, 5),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("search.title")} description={t("search.description")} />
      <FilterBar searchPlaceholder={t("search.placeholder")}>
        <Select name="villa" defaultValue={villaId ?? ""} aria-label={t("search.villa")}>
          <option value="">{t("search.allVillas")}</option>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select name="system" defaultValue={system ?? ""} aria-label={t("search.system")}>
          <option value="">{t("search.allSystems")}</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {found.terms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          <Search className="mx-auto mb-2 size-6" aria-hidden />
          {t("search.hint")}
        </div>
      ) : found.results.length === 0 && articles.total === 0 ? (
        <EmptyState title={t("search.none")} />
      ) : (
        <>
          {articles.total > 0 && <ArticleResults results={articles.results} total={articles.total} />}
          {found.results.length > 0 && (
            <>
              <p className="mb-3 text-sm text-muted">
                {found.truncated ? t("search.countTop", { count: found.results.length }) : t("search.count", { count: found.results.length })}
              </p>
              <SearchResults results={found.results} linkFor={(id) => `/work-orders/${id}`} />
            </>
          )}
        </>
      )}
    </div>
  );
}
