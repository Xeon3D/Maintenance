import type { SystemType } from "@/generated/prisma/enums";
import { markdownToText } from "@/lib/markdown";
import { matchRanges, searchTerms, snippet, termsIn, type Range, type Snippet } from "@/lib/search-text";

// Villa knowledge base: which articles a search shows and in what order. Pure (no server imports): the
// villa's knowledge page and the offline field app share it. A villa has tens of articles, not thousands,
// so matching runs over the loaded list with the same rules as the work-order search (lib/search-text.ts):
// case- and accent-insensitive, any part of a word, typos for words of 4+ letters, every word must appear.

export type ArticleLike = {
  id: string;
  title: string;
  body: string;
  system: SystemType | null;
  pinned: boolean;
  updatedAt: string | Date;
  /** Names of the linked assets: they count towards the search. */
  assets: { id: string; name: string }[];
};

export type ArticleFilters = { q?: string; system?: SystemType | null; assetId?: string | null };

export type ArticleMatch<A extends ArticleLike> = {
  article: A;
  titleMarks: Range[];
  /** The body around the first match while searching, else its beginning; null when the body is empty. */
  excerpt: Snippet | null;
};

const time = (d: string | Date) => new Date(d).getTime();

/**
 * Articles that pass the filters. Without search words: pinned first, then the most recently updated.
 * With them: articles matching every word, those with more words in the title first.
 */
export function filterArticles<A extends ArticleLike>(articles: A[], filters: ArticleFilters = {}, excerptLength = 200): ArticleMatch<A>[] {
  const terms = searchTerms(filters.q ?? "");
  const scored = articles
    .filter((a) => (!filters.system || a.system === filters.system) && (!filters.assetId || a.assets.some((x) => x.id === filters.assetId)))
    .flatMap((a) => {
      const text = markdownToText(a.body);
      if (!terms.length) return [{ a, text, inTitle: 0 }];
      const covered = new Set([...termsIn(a.title, terms), ...termsIn(text, terms), ...a.assets.flatMap((x) => termsIn(x.name, terms))]);
      return covered.size === terms.length ? [{ a, text, inTitle: termsIn(a.title, terms).length }] : [];
    });
  scored.sort((x, y) => y.inTitle - x.inTitle || Number(y.a.pinned) - Number(x.a.pinned) || time(y.a.updatedAt) - time(x.a.updatedAt));
  return scored.map(({ a, text }) => ({
    article: a,
    titleMarks: terms.length ? matchRanges(a.title, terms) : [],
    excerpt: text ? snippet(text, terms, excerptLength) : null,
  }));
}
