import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { SystemBadge } from "@/components/badges";
import { Highlighted } from "@/components/search-results";
import type { ArticleResult } from "@/lib/knowledge-search";

// Knowledge-base articles found by the global search (lib/knowledge-search.ts), above the work orders on /search
// and in the field app's search. Each opens the article's page in the full app.

export function ArticleResults({ results, total, compact = false }: { results: ArticleResult[]; total: number; compact?: boolean }) {
  const t = useTranslations("search");
  return (
    <section className="mb-5">
      <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
        <BookOpen className="size-4 text-muted" aria-hidden />
        {t("articles", { count: total })}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {results.map((a) => (
          <li key={a.id}>
            <a href={`/villas/${a.villaId}/knowledge/${a.id}`} className="block px-4 py-3 hover:bg-gray-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-brand">
                  <Highlighted text={a.title} marks={a.titleMarks} />
                </span>
                {!compact && a.system && <SystemBadge system={a.system} />}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted">{[a.villa, ...a.assets].join(" · ")}</div>
              {a.excerpt && (
                <p className="mt-1 line-clamp-2 break-words text-sm">
                  {a.excerpt.cutStart && "… "}
                  <Highlighted text={a.excerpt.text} marks={a.excerpt.marks} />
                  {a.excerpt.cutEnd && " …"}
                </p>
              )}
            </a>
          </li>
        ))}
      </ul>
      {total > results.length && <p className="mt-1 text-xs text-muted">{t("articlesMore", { count: total - results.length })}</p>}
    </section>
  );
}
