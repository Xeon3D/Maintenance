"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { optEnumOf, parseForm, str, type FormResult } from "@/lib/forms";
import { deleteObject } from "@/lib/storage";
import { SystemType } from "@/generated/prisma/enums";

const base = (villaId: string) => `/villas/${villaId}/knowledge`;

const articleSchema = z.object({
  title: str(200),
  body: z.string().max(50_000).transform((s) => s.replace(/\s+$/, "")),
  system: optEnumOf(SystemType),
});

export async function saveArticleAction(villaId: string, articleId: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("knowledge.manage");
  await assertOwned(ctx.db, "villa", [villaId]);
  const parsed = parseForm(articleSchema, form);
  if (parsed.error) return parsed.error;
  const data = { ...parsed.data, pinned: form.get("pinned") === "on", updatedById: ctx.user.id };

  // Linked assets must be at this villa.
  const wanted = [...new Set(form.getAll("assetIds").map(String).filter(Boolean))].slice(0, 200);
  const assets = wanted.length ? await ctx.db.asset.findMany({ where: { id: { in: wanted }, villaId }, select: { id: true } }) : [];
  if (assets.length !== wanted.length) return { error: "somethingWrong" };

  let id = articleId;
  if (articleId) {
    if (!(await ctx.db.knowledgeArticle.count({ where: { id: articleId, villaId } }))) return { error: "somethingWrong" };
    await ctx.db.knowledgeArticle.update({ where: { id: articleId }, data: { ...data, assets: { set: assets } } });
  } else {
    const created = await ctx.db.knowledgeArticle.create({
      data: { ...data, organizationId: ctx.organization.id, villaId, createdById: ctx.user.id, assets: { connect: assets } },
    });
    id = created.id;
  }
  revalidatePath(`/villas/${villaId}`);
  revalidatePath(base(villaId));
  redirect(`${base(villaId)}/${id}`);
}

export async function deleteArticleAction(villaId: string, articleId: string) {
  const ctx = await requirePermission("knowledge.manage");
  const article = await ctx.db.knowledgeArticle.findFirst({ where: { id: articleId, villaId }, select: { id: true } });
  if (!article) return;
  const files = await ctx.db.attachment.findMany({ where: { articleId } });
  await ctx.db.knowledgeArticle.delete({ where: { id: articleId } });
  await Promise.all(files.map((f) => deleteObject(f.url).catch(() => undefined)));
  revalidatePath(`/villas/${villaId}`);
  revalidatePath(base(villaId));
  redirect(base(villaId));
}

export async function deleteArticleAttachmentAction(villaId: string, articleId: string, attachmentId: string) {
  const ctx = await requirePermission("knowledge.manage");
  const att = await ctx.db.attachment.findFirst({ where: { id: attachmentId, articleId, article: { villaId } } });
  if (!att) return;
  await ctx.db.attachment.delete({ where: { id: att.id } });
  await deleteObject(att.url).catch(() => undefined);
  revalidatePath(`${base(villaId)}/${articleId}`);
}
