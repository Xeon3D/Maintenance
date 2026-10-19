"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Paperclip, Search } from "lucide-react";
import { SystemBadge } from "@/components/badges";
import { Markdown } from "@/components/markdown";
import { ArticleList } from "@/components/knowledge/article-list";
import { filterArticles } from "@/lib/knowledge";
import type { OfflineArticle } from "@/lib/offline-types";

// The villa's knowledge base inside a job in the field app: works offline (the text is in the snapshot);
// attached files open the web page, which needs a connection.

export function KnowledgeSection({ articles, assetId }: { articles: OfflineArticle[]; assetId: string | null }) {
  const t = useTranslations("knowledge");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [reading, setReading] = useState<string | null>(null);

  const matches = useMemo(() => {
    const found = filterArticles(articles, { q }, 140);
    // Without a search, articles about this job's asset come first.
    if (q.trim() || !assetId) return found;
    const about = (m: (typeof found)[number]) => m.article.assets.some((a) => a.id === assetId);
    return [...found.filter(about), ...found.filter((m) => !about(m))];
  }, [articles, q, assetId]);

  const article = reading ? articles.find((a) => a.id === reading) : null;

  if (article) {
    return (
      <section className="border-b border-border bg-surface px-4 py-3">
        <button onClick={() => setReading(null)} className="-ml-1 mb-2 inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeft className="size-4" />
          {t("title")}
        </button>
        <h2 className="font-semibold">{article.title}</h2>
        <div className="mb-3 mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          {article.system && <SystemBadge system={article.system} />}
          <span>{t("updated", { when: format.dateTime(new Date(article.updatedAt), { dateStyle: "medium" }) })}</span>
        </div>
        {article.body.trim() ? <Markdown source={article.body} /> : <p className="text-sm text-muted">{t("noText")}</p>}
        {article.files > 0 && (
          <a href={`/villas/${article.villaId}/knowledge/${article.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-brand">
            <Paperclip className="size-4" />
            {t("filesOnline", { count: article.files })}
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium" aria-expanded={open}>
        <span className="inline-flex items-center gap-2">
          <BookOpen className="size-4 text-muted" />
          {t("title")}
          <span className="font-normal text-muted">{articles.length}</span>
        </span>
        {open ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
      </button>
      {open && (
        <div className="pb-2">
          {articles.length > 5 && (
            <div className="relative px-4 pb-2">
              <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-[calc(50%+4px)] text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm"
              />
            </div>
          )}
          {matches.length === 0 ? (
            <p className="px-4 py-2 text-sm text-muted">{t("noMatches")}</p>
          ) : (
            <ArticleList matches={matches} onOpen={setReading} />
          )}
        </div>
      )}
    </section>
  );
}
