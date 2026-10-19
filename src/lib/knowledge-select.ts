import type { Prisma } from "@/generated/prisma/client";
import type { ListedArticle } from "@/components/knowledge/article-list";
import type { TenantDb } from "@/lib/db/tenant";

// What article lists load (villa page, knowledge page, asset page), and its list shape.

export const ARTICLE_LIST_SELECT = {
  id: true,
  title: true,
  body: true,
  system: true,
  pinned: true,
  updatedAt: true,
  updatedBy: { select: { name: true } },
  assets: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  _count: { select: { attachments: true } },
} satisfies Prisma.KnowledgeArticleSelect;

type Row = Prisma.KnowledgeArticleGetPayload<{ select: typeof ARTICLE_LIST_SELECT }>;

export const listedArticle = (r: Row): ListedArticle => ({
  id: r.id,
  title: r.title,
  body: r.body,
  system: r.system,
  pinned: r.pinned,
  updatedAt: r.updatedAt,
  updatedBy: r.updatedBy?.name ?? null,
  assets: r.assets,
  files: r._count.attachments,
});

/** The villa's assets an article can be linked to (the article form); archived ones only when already linked. */
export async function villaAssetChoices(db: TenantDb, villaId: string, linked: string[] = []) {
  const rows = await db.asset.findMany({
    where: { villaId, OR: [{ archivedAt: null }, { id: { in: linked } }] },
    select: { id: true, name: true, system: true, area: { select: { name: true } } },
    orderBy: [{ system: "asc" }, { name: "asc" }],
  });
  return rows.map((a) => ({ id: a.id, name: a.name, system: a.system, area: a.area?.name ?? null }));
}
