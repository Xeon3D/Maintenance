import type { Prisma } from "@/generated/prisma/client";

// What a client-portal user may see (pure, so it can be tested). A villa is reachable by portal users
// of its owner and of its property manager / managing company; a manager may manage villas of several
// owners, while each owner only reaches the villas they own.

export function villaAccess(clientId: string): Prisma.VillaWhereInput {
  return { OR: [{ clientId }, { managerId: clientId }] };
}

export function portalScopes(clientId: string, userId: string) {
  const villa = villaAccess(clientId);
  return {
    villaWhere: { ...villa, archivedAt: null } satisfies Prisma.VillaWhereInput,
    requestWhere: { OR: [{ villa }, { requesterId: userId }] } satisfies Prisma.RequestWhereInput,
    workOrderWhere: { clientVisible: true, villa } satisfies Prisma.WorkOrderWhereInput,
  };
}
