"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/(auth)/actions";
import { LOCALES } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { en: "English", pt: "Português" };

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className={cn("inline-flex rounded-md border border-border bg-surface p-0.5 text-xs", className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={cn("rounded px-2.5 py-1", l === locale ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground")}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
