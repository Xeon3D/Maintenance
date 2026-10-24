import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Paperclip, Pin } from "lucide-react";
import { SystemBadge } from "@/components/badges";
import { Highlighted } from "@/components/search-results";
import type { ArticleLike, ArticleMatch } from "@/lib/knowledge";

// Knowledge-base articles as a list (villa page, the villa's knowledge page, the field app). No client
// state: pass `hrefFor` to link each article, or `onOpen` (client components only) to open it in place.

export type ListedArticle = ArticleLike & { updatedBy?: string | null; files?: number };

export function ArticleList<A extends ListedArticle>({
  matches,
  hrefFor,
  onOpen,
  compact,
}: {
  matches: ArticleMatch<A>[];
  hrefFor?: (id: string) => string;
  onOpen?: (id: string) => void;
  /** Title and badges only (the villa page card). */
  compact?: boolean;
}) {
  const t = useTranslations("knowledge");
  const format = useFormatter();
  return (
    <ul className="divide-y divide-border">
      {matches.map(({ article: a, titleMarks, excerpt }) => {
        const body = (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {a.pinned && <Pin className="size-3.5 shrink-0 text-brand" aria-label={t("pinned")} />}
              <span className="font-medium">
                <Highlighted text={a.title} marks={titleMarks} />
              </span>
              {a.system && <SystemBadge system={a.system} />}
            </div>
            {!compact && excerpt && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {excerpt.cutStart && "… "}
                <Highlighted text={excerpt.text} marks={excerpt.marks} />
                {excerpt.cutEnd && " …"}
              </p>
            )}
            {!compact && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {a.assets.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Box className="size-3" />
                    {a.assets.map((x) => x.name).join(", ")}
                  </span>
                )}
                {!!a.files && (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="size-3" />
                    {a.files}
                  </span>
                )}
                <span>
                  {a.updatedBy
                    ? t("updatedBy", { name: a.updatedBy, when: format.dateTime(new Date(a.updatedAt), { dateStyle: "medium" }) })
                    : t("updated", { when: format.dateTime(new Date(a.updatedAt), { dateStyle: "medium" }) })}
                </span>
              </div>
            )}
          </>
        );
        const cls = "block w-full px-5 py-3 text-left hover:bg-gray-50";
        return (
          <li key={a.id}>
            {hrefFor ? (
              <Link href={hrefFor(a.id)} className={cls}>
                {body}
              </Link>
            ) : onOpen ? (
              <button type="button" onClick={() => onOpen(a.id)} className={cls}>
                {body}
              </button>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
