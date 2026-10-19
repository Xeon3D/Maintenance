import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Box, Pencil, Pin } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { SystemBadge } from "@/components/badges";
import { Markdown } from "@/components/markdown";
import { getContext } from "@/lib/context";
import { fileUrl } from "@/lib/storage";
import { titled } from "@/lib/metadata";
import { deleteArticleAttachmentAction } from "../actions";

export const generateMetadata = titled("knowledge.title");

export default async function ArticlePage({ params }: PageProps<"/villas/[id]/knowledge/[articleId]">) {
  const { id, articleId } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const article = await ctx.db.knowledgeArticle.findFirst({
    where: { id: articleId, villaId: id },
    include: {
      villa: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      assets: { select: { id: true, name: true, archivedAt: true }, orderBy: { name: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!article) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const canManage = ctx.can("knowledge.manage");
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <BackLink href={`/villas/${id}/knowledge`} label={`${article.villa.name} · ${t("knowledge.title")}`} />
      <PageHeader
        title={article.title}
        actions={
          canManage && (
            <Link href={`/villas/${id}/knowledge/${articleId}/edit`}>
              <Button variant="secondary">
                <Pencil className="size-4" />
                {t("common.edit")}
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {article.pinned && (
          <Badge className="gap-1">
            <Pin className="size-3" />
            {t("knowledge.pinned")}
          </Badge>
        )}
        {article.system ? <SystemBadge system={article.system} /> : <Badge>{t("knowledge.general")}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          {article.body.trim() ? <Markdown source={article.body} /> : <p className="text-sm text-muted">{t("knowledge.noText")}</p>}
        </Card>

        <div className="space-y-6">
          {article.assets.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 font-medium">{t("knowledge.assets")}</h2>
              <ul className="space-y-1 text-sm">
                {article.assets.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assets/${a.id}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                      <Box className="size-3.5 text-muted" />
                      {a.name}
                      {a.archivedAt && <span className="text-xs text-muted">({t("common.archived")})</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 font-medium">{t("knowledge.files")}</h2>
            {article.attachments.length === 0 && !canManage ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <AttachmentsPanel
                target={{ articleId: article.id }}
                canEdit={canManage}
                onDelete={deleteArticleAttachmentAction.bind(null, id, article.id)}
                files={article.attachments.map((f) => ({ id: f.id, url: fileUrl(f.id), filename: f.filename, mimeType: f.mimeType }))}
              />
            )}
          </Card>

          <Card className="space-y-1 p-5 text-xs text-muted">
            <p>{article.createdBy ? t("knowledge.createdBy", { name: article.createdBy.name, when: date(article.createdAt) }) : t("knowledge.created", { when: date(article.createdAt) })}</p>
            {article.updatedAt.getTime() - article.createdAt.getTime() > 60_000 && (
              <p>{article.updatedBy ? t("knowledge.updatedBy", { name: article.updatedBy.name, when: date(article.updatedAt) }) : t("knowledge.updated", { when: date(article.updatedAt) })}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
