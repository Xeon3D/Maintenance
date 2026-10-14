import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut, UserRound } from "lucide-react";
import { NotificationBell } from "@/components/notifications/bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTheme } from "@/lib/theme-server";
import { getPortalContext } from "@/lib/portal";
import { signOutAction } from "@/app/(auth)/actions";
import { brandStyle, logoSrc } from "@/lib/branding";
import { privacyPath } from "@/lib/privacy";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  const theme = await getTheme();
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
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle initial={theme} className="hidden sm:inline-flex" />
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
      <footer className="pb-6 text-center text-xs">
        <Link href={privacyPath(ctx.organization)} className="text-muted hover:text-brand">
          {t("privacy.title")}
        </Link>
      </footer>
      {/* New requests start from a property (portal home → property → New request). */}
      <div className="flex justify-center gap-2 pb-6 sm:hidden">
        <LocaleSwitcher />
        <ThemeToggle initial={theme} />
      </div>
    </div>
  );
}
