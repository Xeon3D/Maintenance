import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Context for client-portal users (role REQUESTER). They are scoped to their membership's
 * client: that client's villas, requests for those villas, and client-visible work orders.
 */
export const getPortalContext = cache(async () => {
  const ctx = await getContext();
  if (ctx.role !== "REQUESTER") redirect("/dashboard");
  // A requester without a client sees nothing (an impossible id keeps queries simple).
  const clientId = ctx.membership.clientId ?? "__none__";
  const villaWhere: Prisma.VillaWhereInput = { clientId, archivedAt: null };
  const requestWhere: Prisma.RequestWhereInput = { OR: [{ villa: { clientId } }, { requesterId: ctx.user.id }] };
  const workOrderWhere: Prisma.WorkOrderWhereInput = { clientVisible: true, villa: { clientId } };
  return { ...ctx, clientId, villaWhere, requestWhere, workOrderWhere };
});

export type PortalContext = Awaited<ReturnType<typeof getPortalContext>>;
