import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut, Plus, UserRound } from "lucide-react";
import { NotificationBell } from "@/components/notifications/bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui";
import { getPortalContext } from "@/lib/portal";
import { signOutAction } from "@/app/(auth)/actions";
import { brandStyle, logoSrc } from "@/lib/branding";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  const t = await getTranslations();
  const logo = logoSrc(ctx.organization);
  const unread = await ctx.db.notification.count({ where: { userId: ctx.user.id, readAt: null } });
  return (
    <div className="min-h-screen" style={brandStyle(ctx.organization)}>
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-9 max-w-24 shrink-0 object-contain" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-brand">{ctx.organization.name}</span>
              <span className="block truncate text-xs text-muted">{t("portal.title")}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/portal/requests/new" className="hidden sm:block">
              <Button size="sm">
                <Plus className="size-4" />
                {t("portal.newRequest")}
              </Button>
            </Link>
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <NotificationBell key={unread} initial={unread} href="/portal/notifications" />
            <Link href="/portal/profile" title={t("nav.profile")} className="rounded-md p-2 text-muted hover:bg-gray-100">
              <UserRound className="size-4" />
            </Link>
            <form action={signOutAction}>
              <button title={t("common.signOut")} className="rounded-md p-2 text-muted hover:bg-gray-100">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      {/* Mobile: the main action is always one tap away. */}
      <Link
        href="/portal/requests/new"
        className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-brand-foreground shadow-lg sm:hidden"
      >
        <Plus className="size-4" />
        {t("portal.newRequest")}
      </Link>
      <div className="flex justify-center pb-24 sm:hidden">
        <LocaleSwitcher />
      </div>
    </div>
  );
}
