"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

const POLL_MS = 30_000;

/** Bell with the unread count; refreshes on navigation and every 30 s while the tab is visible.
 *  Callers key it on the server count so a fresh server value resets it. */
export function NotificationBell({ initial, href }: { initial: number; href: string }) {
  const t = useTranslations("notifications");
  const pathname = usePathname();
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    const load = () =>
      document.visibilityState === "visible" &&
      fetch("/api/badges", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => alive && b && setCount(b.notifications))
        .catch(() => undefined);
    const timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);

  return (
    <Link href={href} title={t("title")} aria-label={count ? t("unreadCount", { count }) : t("title")} className="relative rounded-md p-2 text-muted hover:bg-gray-100 hover:text-foreground">
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
