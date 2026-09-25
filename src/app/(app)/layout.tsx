import { Sidebar } from "@/components/shell/sidebar";
import { NAV } from "@/components/shell/nav";
import { getContext } from "@/lib/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.ready && (!i.permission || ctx.can(i.permission))),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen">
      <Sidebar
        groups={groups}
        user={{ name: ctx.user.name, email: ctx.user.email, role: ctx.role }}
        org={{ id: ctx.organization.id, name: ctx.organization.name }}
        orgs={ctx.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
