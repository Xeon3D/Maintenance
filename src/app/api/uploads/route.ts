import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { putObject, fileUrl } from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Exactly one owner. Comment/message links are attached later by their actions.
const targetSchema = z.union([
  z.object({ workOrderId: z.string() }),
  z.object({ workOrderItemId: z.string() }),
  z.object({ assetId: z.string() }),
  z.object({ villaId: z.string() }),
  z.object({ partId: z.string() }),
  z.object({ purchaseOrderId: z.string() }),
]);

export async function POST(req: Request) {
  const ctx = await getContext();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "noFile" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "badType" }, { status: 415 });

  const target = targetSchema.safeParse(JSON.parse(String(form.get("target") ?? "{}")));
  if (!target.success) return NextResponse.json({ error: "badTarget" }, { status: 400 });
  const t = target.data;

  // Authorise against the owning record (tenant-scoped lookups).
  if ("workOrderId" in t || "workOrderItemId" in t) {
    if (!ctx.can("workOrders.execute")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const ok =
      "workOrderId" in t
        ? await ctx.db.workOrder.count({ where: { id: t.workOrderId } })
        : await ctx.db.workOrder.count({ where: { items: { some: { id: t.workOrderItemId } } } });
    if (!ok) return NextResponse.json({ error: "notFound" }, { status: 404 });
  } else if ("partId" in t) {
    if (!ctx.can("inventory.manage")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!(await ctx.db.part.count({ where: { id: t.partId } }))) return NextResponse.json({ error: "notFound" }, { status: 404 });
  } else if ("purchaseOrderId" in t) {
    if (!ctx.can("purchasing.manage")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!(await ctx.db.purchaseOrder.count({ where: { id: t.purchaseOrderId } }))) return NextResponse.json({ error: "notFound" }, { status: 404 });
  } else {
    if (!ctx.can("assets.manage")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const ok =
      "assetId" in t ? await ctx.db.asset.count({ where: { id: t.assetId } }) : await ctx.db.villa.count({ where: { id: t.villaId } });
    if (!ok) return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const month = new Date().toISOString().slice(0, 7);
  const key = `${ctx.organization.id}/${month}/${randomBytes(12).toString("hex")}.${ext}`;
  const ref = await putObject(key, Buffer.from(await file.arrayBuffer()));

  // For checklist items, also link the parent WO so the photo shows in the WO gallery.
  let workOrderId = "workOrderId" in t ? t.workOrderId : undefined;
  if ("workOrderItemId" in t) {
    const item = await ctx.db.workOrderItem.findUnique({ where: { id: t.workOrderItemId }, select: { workOrderId: true } });
    workOrderId = item?.workOrderId;
  }

  const att = await ctx.db.attachment.create({
    data: {
      organizationId: ctx.organization.id,
      url: ref,
      filename: file.name.slice(0, 200) || `upload.${ext}`,
      mimeType: file.type,
      size: file.size,
      uploadedById: ctx.user.id,
      ...t,
      workOrderId,
    },
  });
  return NextResponse.json({ id: att.id, url: fileUrl(att.id), filename: att.filename, mimeType: att.mimeType });
}
