import "server-only";
import type { SystemType } from "@/generated/prisma/enums";
import type { TenantDb } from "@/lib/db/tenant";
import { filterArticles } from "@/lib/knowledge";
import { ARTICLE_LIST_SELECT, listedArticle } from "@/lib/knowledge-select";
import { searchTerms, type Range, type Snippet } from "@/lib/search-text";

// Knowledge-base articles in the global search (/search and /api/search for the field app). Articles are few
// (tens per villa), so they are matched in memory with the villa knowledge page's rules (lib/knowledge.ts).

export type ArticleResult = {
  id: string;
  villaId: string;
  villa: string;
  title: string;
  titleMarks: Range[];
  system: SystemType | null;
  excerpt: Snippet | null;
  assets: string[];
};

/** Articles read per search, most recently updated first; far more than a company writes. */
const MAX_ROWS = 3000;

export async function searchArticles(
  db: TenantDb,
  query: string,
  filters: { villaId?: string; system?: SystemType } = {},
  limit = 20,
): Promise<{ results: ArticleResult[]; total: number }> {
  // Same terms as the work-order search: none (e.g. a single letter) means nothing to search for.
  if (searchTerms(query).length === 0) return { results: [], total: 0 };
  const rows = await db.knowledgeArticle.findMany({
    where: { ...(filters.villaId ? { villaId: filters.villaId } : {}), ...(filters.system ? { system: filters.system } : {}) },
    select: { ...ARTICLE_LIST_SELECT, villa: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: MAX_ROWS,
  });
  const villas = new Map(rows.map((r) => [r.id, r.villa]));
  const found = filterArticles(rows.map(listedArticle), { q: query });
  return {
    total: found.length,
    results: found.slice(0, limit).map(({ article: a, titleMarks, excerpt }) => ({
      id: a.id,
      villaId: villas.get(a.id)!.id,
      villa: villas.get(a.id)!.name,
      title: a.title,
      titleMarks,
      system: a.system,
      excerpt,
      assets: a.assets.map((x) => x.name),
    })),
  };
}
