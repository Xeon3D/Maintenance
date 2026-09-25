import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { can, type Permission } from "@/lib/rbac";

export const ACTIVE_ORG_COOKIE = "active_org";

/** Signed-in user or redirect to /login. */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  return user;
});

/**
 * Resolves user + active organization + membership for the current request.
 * The active org comes from a cookie and falls back to the user's first membership;
 * users with no organization are sent to onboarding.
 */
export const getContext = cache(async () => {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, active: true },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) redirect("/onboarding");

  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const membership = memberships.find((m) => m.organizationId === wanted) ?? memberships[0];

  return {
    user,
    membership,
    organization: membership.organization,
    memberships,
    role: membership.role,
    db: tenantDb(membership.organizationId),
    can: (p: Permission) => can(membership.role, p),
  };
});

export type AppContext = Awaited<ReturnType<typeof getContext>>;

/** Context guaranteed to hold `permission`; throws otherwise (server actions) . */
export async function requirePermission(permission: Permission) {
  const ctx = await getContext();
  if (!ctx.can(permission)) throw new Error("Forbidden");
  return ctx;
}
