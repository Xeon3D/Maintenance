"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

/** Floating back button, bottom-right (where the help button sits elsewhere). Without history, goes to `fallback`. */
export function BackButton({ fallback }: { fallback: string }) {
  const t = useTranslations("report");
  return (
    <button
      type="button"
      onClick={() => (history.length > 1 ? history.back() : location.assign(fallback))}
      aria-label={t("back")}
      title={t("back")}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg ring-1 ring-black/5 transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 print:hidden"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
