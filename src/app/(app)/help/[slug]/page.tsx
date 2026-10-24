import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { HelpBlocks } from "@/components/help/article";
import { TopicIcon } from "@/components/help/topic-icon";
import { getContext } from "@/lib/context";
import { helpArticle, shotSrc, visibleTopics } from "@/lib/help-content";
import { appLocale } from "@/i18n/config";

export async function generateMetadata({ params }: PageProps<"/help/[slug]">): Promise<Metadata> {
  const t = await getTranslations();
  const a = helpArticle((await params).slug, appLocale(await getLocale()));
  return { title: a ? `${a.title} · ${t("help.title")}` : t("help.title") };
}

export default async function HelpArticlePage({ params }: PageProps<"/help/[slug]">) {
  const { slug } = await params;
  const ctx = await getContext();
  const t = await getTranslations();
  const locale = appLocale(await getLocale());
  const topic = visibleTopics(ctx.can).find((x) => x.slug === slug);
  const article = topic && helpArticle(slug, locale);
  if (!topic || !article) notFound();
  const src = (name: string) => shotSrc(locale, name);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
      <article className="min-w-0 max-w-3xl">
        <BackLink href="/help" label={t("help.allTopics")} />
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <TopicIcon name={topic.icon} className="mt-1 size-6 shrink-0 text-brand" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{article.title}</h1>
            </div>
          </div>
          {topic.href && (
            <Link
              href={topic.href}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-gray-50"
            >
              {t("help.openArea")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </header>

        <div className="space-y-4 text-sm leading-relaxed text-gray-700">
          <HelpBlocks blocks={article.intro} shotSrc={src} />
        </div>

        {article.sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-8 scroll-mt-20 space-y-4 text-sm leading-relaxed text-gray-700">
            <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
            <HelpBlocks blocks={s.blocks} shotSrc={src} />
          </section>
        ))}
      </article>

      {article.sections.length > 1 && (
        <nav aria-label={t("help.onThisPage")} className="hidden lg:block">
          <div className="sticky top-8">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t("help.onThisPage")}</div>
            <ul className="space-y-1.5 border-l border-border text-sm">
              {article.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-brand hover:text-foreground">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
