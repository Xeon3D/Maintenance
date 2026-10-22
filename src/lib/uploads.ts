import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { AppContext } from "@/lib/context";

// Shared by /api/uploads (photos, PDFs) and /api/uploads/video.

// Exactly one owner. Comment/message links are attached later by their actions. `draftForVillaId` = an image in
// the text of a knowledge article being written: stored without an owner until the article is saved
// (`adoptArticleImages`); the daily retention run removes the ones never saved.
export const targetSchema = z.union([
  z.object({ workOrderId: z.string() }),
  z.object({ workOrderItemId: z.string() }),
  z.object({ assetId: z.string() }),
  z.object({ villaId: z.string() }),
  z.object({ partId: z.string() }),
  z.object({ purchaseOrderId: z.string() }),
  z.object({ articleId: z.string() }),
  z.object({ draftForVillaId: z.string() }),
]);
export type Target = z.infer<typeof targetSchema>;

/** Where every owner of an attachment is empty: a draft article image not saved (yet). */
export const NO_OWNER = {
  workOrderId: null,
  workOrderItemId: null,
  commentId: null,
  requestId: null,
  assetId: null,
  villaId: null,
  procedureId: null,
  partId: null,
  purchaseOrderId: null,
  messageId: null,
  articleId: null,
} as const;

type Denied = { error: "forbidden" | "notFound"; status: 403 | 404 };

/** Checks the user may add files to the owning record (tenant-scoped lookups). Null = allowed. */
export async function denyTarget(ctx: AppContext, t: Target): Promise<Denied | null> {
  const forbidden: Denied = { error: "forbidden", status: 403 };
  const notFound: Denied = { error: "notFound", status: 404 };
  if ("workOrderId" in t || "workOrderItemId" in t) {
    if (!ctx.can("workOrders.execute")) return forbidden;
    const ok =
      "workOrderId" in t
        ? await ctx.db.workOrder.count({ where: { id: t.workOrderId } })
        : await ctx.db.workOrder.count({ where: { items: { some: { id: t.workOrderItemId } } } });
    return ok ? null : notFound;
  }
  if ("partId" in t) {
    if (!ctx.can("inventory.manage")) return forbidden;
    return (await ctx.db.part.count({ where: { id: t.partId } })) ? null : notFound;
  }
  if ("purchaseOrderId" in t) {
    if (!ctx.can("purchasing.manage")) return forbidden;
    return (await ctx.db.purchaseOrder.count({ where: { id: t.purchaseOrderId } })) ? null : notFound;
  }
  if ("articleId" in t) {
    if (!ctx.can("knowledge.manage")) return forbidden;
    return (await ctx.db.knowledgeArticle.count({ where: { id: t.articleId } })) ? null : notFound;
  }
  if ("draftForVillaId" in t) {
    if (!ctx.can("knowledge.manage")) return forbidden;
    return (await ctx.db.villa.count({ where: { id: t.draftForVillaId } })) ? null : notFound;
  }
  if (!ctx.can("assets.manage")) return forbidden;
  const ok = "assetId" in t ? await ctx.db.asset.count({ where: { id: t.assetId } }) : await ctx.db.villa.count({ where: { id: t.villaId } });
  return ok ? null : notFound;
}

export function storageKey(orgId: string, ext: string) {
  const month = new Date().toISOString().slice(0, 7);
  return `${orgId}/${month}/${randomBytes(12).toString("hex")}.${ext}`;
}

/** Records the stored file. Checklist photos also get their work order, so they show in its gallery. */
export async function createAttachment(ctx: AppContext, t: Target, file: { ref: string; filename: string; mimeType: string; size: number }) {
  let workOrderId = "workOrderId" in t ? t.workOrderId : undefined;
  if ("workOrderItemId" in t) {
    const item = await ctx.db.workOrderItem.findUnique({ where: { id: t.workOrderItemId }, select: { workOrderId: true } });
    workOrderId = item?.workOrderId;
  }
  return ctx.db.attachment.create({
    data: {
      organizationId: ctx.organization.id,
      url: file.ref,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      uploadedById: ctx.user.id,
      ...("draftForVillaId" in t ? {} : t),
      workOrderId,
    },
  });
}
