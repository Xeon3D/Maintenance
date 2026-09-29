import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { getAppName } from "@/lib/server-settings";
import { NAV } from "@/components/shell/nav";
import { getContext } from "@/lib/context";
import { unreadConversations } from "@/lib/conversations";
import { brandStyle, logoSrc } from "@/lib/branding";
import { getTranslations } from "next-intl/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  // Client users live in the portal.
  if (ctx.role === "REQUESTER") redirect("/portal");
  const t = await getTranslations();

  const [pendingRequests, posToApprove, unreadMessages, unreadNotifications] = await Promise.all([
    ctx.can("requests.approve") ? ctx.db.request.count({ where: { status: "PENDING" } }) : 0,
    ctx.can("purchasing.approve") ? ctx.db.purchaseOrder.count({ where: { status: "PENDING_APPROVAL" } }) : 0,
    ctx.can("internal.view") ? unreadConversations(ctx) : 0,
    ctx.db.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
  ]);
  const badges: Record<string, number> = { "/requests": pendingRequests, "/purchase-orders": posToApprove, "/messages": unreadMessages };
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => i.ready && (!i.permission || ctx.can(i.permission)))
      .map((i) => (badges[i.href] ? { ...i, badge: badges[i.href] } : i)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen" style={brandStyle(ctx.organization)}>
      <Sidebar
        appName={await getAppName()}
        groups={groups}
        user={{ name: ctx.user.name, email: ctx.user.email, role: ctx.membership.jobRole?.name ?? t(`roles.${ctx.role}`) }}
        org={{ id: ctx.organization.id, name: ctx.organization.name, logo: logoSrc(ctx.organization) }}
        orgs={ctx.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))}
        unreadNotifications={unreadNotifications}
      />
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}
