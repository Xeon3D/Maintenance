import "server-only";
import { HELP_CONTENT } from "@/content/help";
import { HELP_TOPICS, parseHelp, plainText, type HelpArticle, type HelpBlock, type HelpTopic } from "@/lib/help";
import type { Locale } from "@/i18n/config";
import type { Permission } from "@/lib/rbac";

const cache = new Map<string, HelpArticle>();

/** The parsed article for a topic in a language (parsed once per process). */
export function helpArticle(slug: string, locale: Locale): HelpArticle | undefined {
  const mod = HELP_CONTENT[slug];
  if (!mod) return undefined;
  const key = `${locale}:${slug}`;
  let article = cache.get(key);
  if (!article) {
    article = parseHelp(mod.default[locale]);
    cache.set(key, article);
  }
  return article;
}

/** Topics this member may read: the same permission as the area itself. */
export const visibleTopics = (can: (p: Permission) => boolean): HelpTopic[] =>
  HELP_TOPICS.filter((t) => !t.permission || can(t.permission));

export const shotSrc = (locale: Locale, name: string) => `/help-shots/${locale}/${name}.png`;

const blockText = (b: HelpBlock): string => {
  switch (b.type) {
    case "p":
    case "tip":
      return plainText(b.content);
    case "h3":
      return b.text;
    case "ul":
    case "ol":
      return b.items.map(plainText).join(" ");
    case "shot":
      return b.caption;
  }
};

export type HelpHit = { topic: HelpTopic; title: string; sectionId?: string; sectionTitle?: string; snippet: string };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Sections matching every word of the query (accent- and case-insensitive), article titles first. */
export function searchHelp(query: string, topics: HelpTopic[], locale: Locale): HelpHit[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const hits: { hit: HelpHit; score: number }[] = [];
  for (const topic of topics) {
    const a = helpArticle(topic.slug, locale);
    if (!a) continue;
    const parts = [
      { id: undefined, title: undefined, text: [a.summary, ...a.intro.map(blockText)].join(" ") },
      ...a.sections.map((s) => ({ id: s.id, title: s.title, text: s.blocks.map(blockText).join(" ") })),
    ];
    for (const part of parts) {
      const hay = fold(`${a.title} ${part.title ?? ""} ${part.text}`);
      if (!words.every((w) => hay.includes(w))) continue;
      const head = fold(`${a.title} ${part.title ?? ""}`);
      const score = words.filter((w) => head.includes(w)).length;
      const at = Math.max(0, fold(part.text).indexOf(words[0]) - 60);
      const snippet = (at > 0 ? "…" : "") + part.text.slice(at, at + 180).trim() + (part.text.length > at + 180 ? "…" : "");
      hits.push({ hit: { topic, title: a.title, sectionId: part.id, sectionTitle: part.title, snippet }, score });
    }
  }
  return hits.sort((x, y) => y.score - x.score).slice(0, 30).map((h) => h.hit);
}
