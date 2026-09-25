import "server-only";
import { headers } from "next/headers";
import type { AppContext } from "@/lib/context";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(
  ctx: AppContext,
  action: string,
  entityType: string,
  entityId: string,
  meta?: Prisma.InputJsonValue,
) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  await ctx.db.auditLog.create({
    data: { organizationId: ctx.organization.id, userId: ctx.user.id, action, entityType, entityId, meta, ip },
  });
}
