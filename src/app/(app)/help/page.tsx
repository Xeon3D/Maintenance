import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Card, Input, PageHeader } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { TopicIcon } from "@/components/help/topic-icon";
import { getContext } from "@/lib/context";
import { helpArticle, searchHelp, visibleTopics } from "@/lib/help-content";
import { HELP_GROUPS } from "@/lib/help";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { appLocale } from "@/i18n/config";

export const generateMetadata = titled("help.title");

export default async function HelpPage({ searchParams }: PageProps<"/help">) {
  const ctx = await getContext();
  const t = await getTranslations();
  const locale = appLocale(await getLocale());
  const q = sp(await searchParams, "q")?.trim() ?? "";
  const topics = visibleTopics(ctx.can);
  const hits = q ? searchHelp(q, topics, locale) : [];

  return (
    <>
      <PageHeader title={t("help.title")} description={t("help.description")} />

      <form action="/help" className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input name="q" type="search" defaultValue={q} placeholder={t("help.searchPlaceholder")} aria-label={t("help.searchPlaceholder")} className="pl-9" />
      </form>

      {q ? (
        hits.length ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("help.results", { count: hits.length, q })}</p>
            {hits.map((h, i) => (
              <Link key={i} href={`/help/${h.topic.slug}${h.sectionId ? `#${h.sectionId}` : ""}`} className="block">
                <Card className="flex gap-3 p-4 transition hover:border-brand/40 hover:bg-gray-50">
                  <TopicIcon name={h.topic.icon} className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {h.title}
                      {h.sectionTitle && <span className="text-muted"> › {h.sectionTitle}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{h.snippet}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title={t("help.noResults", { q })} description={t("help.noResultsHint")} />
        )
      ) : (
        <div className="space-y-8">
          {HELP_GROUPS.map((group) => {
            const inGroup = topics.filter((x) => x.group === group);
            if (!inGroup.length) return null;
            return (
              <section key={group}>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{t(`help.groups.${group}`)}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {inGroup.map((topic) => {
                    const a = helpArticle(topic.slug, locale);
                    if (!a) return null;
                    return (
                      <Link key={topic.slug} href={`/help/${topic.slug}`} className="block">
                        <Card className="flex h-full gap-3 p-4 transition hover:border-brand/40 hover:bg-gray-50">
                          <TopicIcon name={topic.icon} className="mt-0.5 size-5 shrink-0 text-brand" />
                          <div className="min-w-0">
                            <div className="font-medium">{a.title}</div>
                            <p className="mt-1 line-clamp-3 text-sm text-muted">{a.summary}</p>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
