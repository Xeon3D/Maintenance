"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET filter bar: search box + any <select name> children; updates the URL on change. */
export function FilterBar({ children, searchPlaceholder }: { children?: ReactNode; searchPlaceholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function apply() {
    const fd = new FormData(ref.current!);
    const next = new URLSearchParams();
    for (const [k, v] of fd) if (typeof v === "string" && v) next.set(k, v);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(apply, (e.target as HTMLElement).tagName === "INPUT" ? 300 : 0);
      }}
      className="mb-4 flex flex-wrap items-center gap-2 [&_select]:h-9 [&_select]:w-auto [&_select]:min-w-36"
    >
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {children}
    </form>
  );
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    return `${pathname}${next.size ? `?${next}` : ""}`;
  };
  const link = "rounded-md border border-border bg-surface px-3 py-1.5 text-sm";

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>{t("pageOf", { page, pages, total })}</span>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={href(page - 1)} className={cn(link, page <= 1 && "pointer-events-none opacity-40")}>
          {t("previous")}
        </Link>
        <Link aria-disabled={page >= pages} href={href(page + 1)} className={cn(link, page >= pages && "pointer-events-none opacity-40")}>
          {t("next")}
        </Link>
      </div>
    </div>
  );
}
