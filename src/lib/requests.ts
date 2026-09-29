import "server-only";
import { randomBytes } from "node:crypto";
import { nextNumber, type TenantDb } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/client";
import { membersWith, notify, notifyExternal, type NotifyActor } from "@/lib/notify";
import { putObject } from "@/lib/storage";
import { createWorkOrder, type WoCtx, type WorkOrderInput } from "@/lib/work-orders";
import type { Priority, SystemType } from "@/generated/prisma/enums";

export const MAX_REQUEST_PHOTOS = 4;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type RequestInput = {
  title: string;
  description?: string | null;
  priority?: Priority;
  system?: SystemType | null;
  villaId?: string | null;
  areaId?: string | null;
  assetId?: string | null;
  requesterId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
};

/**
 * Creates a request (portal, QR form or staff) and stores its photos.
 * Callers are responsible for having validated villa/asset scope for the submitter.
 */
export async function createRequest(db: TenantDb, organizationId: string, input: RequestInput, photos: File[] = []) {
  const number = await nextNumber(organizationId, "request");
  const req = await db.request.create({
    data: {
      organizationId,
      number,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "NONE",
      system: input.system ?? null,
      villaId: input.villaId ?? null,
      areaId: input.areaId ?? null,
      assetId: input.assetId ?? null,
      requesterId: input.requesterId ?? null,
      requesterName: input.requesterName ?? null,
      requesterEmail: input.requesterEmail ?? null,
      requesterPhone: input.requesterPhone ?? null,
    },
  });

  const month = new Date().toISOString().slice(0, 7);
  for (const file of photos.slice(0, MAX_REQUEST_PHOTOS)) {
    const ext = PHOTO_TYPES[file.type];
    if (!ext || file.size === 0 || file.size > MAX_PHOTO_BYTES) continue;
    const ref = await putObject(`${organizationId}/${month}/${randomBytes(12).toString("hex")}.${ext}`, Buffer.from(await file.arrayBuffer()));
    await db.attachment.create({
      data: {
        organizationId,
        url: ref,
        filename: file.name.slice(0, 200) || `photo.${ext}`,
        mimeType: file.type,
        size: file.size,
        uploadedById: input.requesterId ?? null,
        requestId: req.id,
      },
    });
  }

  const [org, villa] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true } }),
    req.villaId ? db.villa.findUnique({ where: { id: req.villaId }, select: { name: true } }) : null,
  ]);
  await notify({ organization: org, user: input.requesterId ? { id: input.requesterId } : null }, await membersWith(db, "requests.approve"), {
    type: "REQUEST_NEW",
    data: { number: req.number, title: req.title, place: [villa?.name, input.requesterName].filter(Boolean).join(" · ") },
    link: `/requests/${req.id}`,
  });
  return req;
}

/** REQUEST_UPDATE to whoever asked: in-app for portal users, by email for QR-form requesters. */
export async function notifyRequester(
  ctx: NotifyActor & { organization: { defaultLocale: string } },
  req: { id: string; number: number; title: string; requesterId: string | null; requesterEmail: string | null },
  status: "APPROVED" | "DECLINED",
  reason: string | null = null,
) {
  const data = { number: req.number, title: req.title, status, detail: reason ? `${req.title} — ${reason}` : req.title };
  if (req.requesterId) await notify(ctx, [req.requesterId], { type: "REQUEST_UPDATE", data, link: `/portal/requests/${req.id}` });
  else await notifyExternal(ctx.organization, req.requesterEmail, ctx.organization.defaultLocale, "REQUEST_UPDATE", data);
}

/** Turns a pending request into a work order (with overrides) and links the request's photos to it. */
export async function approveRequest(ctx: WoCtx, requestId: string, overrides: Partial<WorkOrderInput>) {
  const req = await ctx.db.request.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") throw new Error("Request is not pending");
  const wo = await createWorkOrder(ctx, {
    title: req.title,
    description: [req.description, requesterLine(req)].filter(Boolean).join("\n\n"),
    priority: req.priority,
    system: req.system,
    villaId: req.villaId,
    areaId: req.areaId,
    assetId: req.assetId,
    type: "REACTIVE",
    ...overrides,
  });
  const claimed = await ctx.db.request.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "APPROVED", workOrderId: wo.id },
  });
  if (claimed.count !== 1) {
    await ctx.db.workOrder.delete({ where: { id: wo.id } }); // someone else approved it first
    throw new Error("Request is not pending");
  }
  await ctx.db.attachment.updateMany({ where: { requestId }, data: { workOrderId: wo.id } });
  await notifyRequester(ctx, req, "APPROVED");
  return wo;
}

function requesterLine(r: { requesterName: string | null; requesterPhone: string | null; requesterEmail: string | null }) {
  const who = [r.requesterName, r.requesterPhone, r.requesterEmail].filter(Boolean).join(" · ");
  return who ? `— ${who}` : null;
}

export async function declineRequest(db: TenantDb, requestId: string, reason: string | null) {
  const res = await db.request.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "DECLINED", declineReason: reason },
  });
  if (res.count !== 1) throw new Error("Request is not pending");
}
