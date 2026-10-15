"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleHelp } from "lucide-react";
import { helpHref } from "@/lib/help";

/**
 * Floating help button, bottom-right: opens the help article for the current page. A round icon that grows to
 * show its label on hover / keyboard focus. Hidden on the help pages themselves and when printing.
 */
export function HelpButton() {
  const t = useTranslations("help");
  const pathname = usePathname();
  if (pathname.startsWith("/help")) return null;
  return (
    <Link
      href={helpHref(pathname)}
      aria-label={t("thisPage")}
      className="group fixed bottom-4 right-4 z-30 flex h-11 items-center overflow-hidden rounded-full bg-brand text-brand-foreground shadow-lg ring-1 ring-black/5 transition-all hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 print:hidden"
    >
      <span className="flex size-11 shrink-0 items-center justify-center">
        <CircleHelp className="size-5" />
      </span>
      <span className="max-w-0 whitespace-nowrap pr-0 text-sm font-medium opacity-0 transition-all duration-200 group-hover:max-w-48 group-hover:pr-4 group-hover:opacity-100 group-focus-visible:max-w-48 group-focus-visible:pr-4 group-focus-visible:opacity-100">
        {t("thisPage")}
      </span>
    </Link>
  );
}
