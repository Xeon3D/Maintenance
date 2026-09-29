import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";
import { portalScopes } from "@/lib/portal-scope";

/**
 * Context for client-portal users (role REQUESTER). They are scoped to their membership's client:
 * the villas it owns or manages, requests for those villas, and client-visible work orders there.
 */
export const getPortalContext = cache(async () => {
  const ctx = await getContext();
  if (ctx.role !== "REQUESTER") redirect("/dashboard");
  // A requester without a client sees nothing (an impossible id keeps queries simple).
  const clientId = ctx.membership.clientId ?? "__none__";
  return { ...ctx, clientId, ...portalScopes(clientId, ctx.user.id) };
});

export type PortalContext = Awaited<ReturnType<typeof getPortalContext>>;
