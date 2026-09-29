"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { setThemeAction } from "@/app/(auth)/actions";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS = { light: Sun, system: Monitor, dark: Moon } as const;

/** Light / system / dark. Applies at once, then saves (to the user when signed in, else a cookie). */
export function ThemeToggle({ initial, className }: { initial: Theme; className?: string }) {
  const t = useTranslations("theme");
  const [theme, setTheme] = useState<Theme>(initial);
  const [, start] = useTransition();

  return (
    <div role="radiogroup" aria-label={t("label")} className={cn("inline-flex rounded-md border border-border bg-surface p-0.5", className)}>
      {(["light", "system", "dark"] as const satisfies readonly Theme[]).map((v) => {
        const Icon = ICONS[v];
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={theme === v}
            title={t(v)}
            onClick={() => {
              setTheme(v);
              document.documentElement.setAttribute("data-theme", v); // the boot script re-resolves "dark"
              // Offline (field app) the choice still applies now; it's saved next time it's changed online.
              start(async () => {
                await setThemeAction(v).catch(() => undefined);
              });
            }}
            className={cn("rounded p-1.5", theme === v ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground")}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{t(v)}</span>
          </button>
        );
      })}
    </div>
  );
}
