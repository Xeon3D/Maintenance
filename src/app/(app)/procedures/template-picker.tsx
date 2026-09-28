"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { SYSTEM_STYLE } from "@/components/badges";
import { cn } from "@/lib/utils";
import type { SystemType } from "@/generated/prisma/enums";
import { installTemplatesAction } from "./actions";

type Tpl = { key: string; name: string; description: string; system: SystemType; steps: number };

export function TemplatePicker({ templates }: { templates: Tpl[] }) {
  const t = useTranslations("procedures");
  const [chosen, setChosen] = useState<Set<string>>(new Set(templates.map((x) => x.key)));
  const [pending, start] = useTransition();
  const toggle = (k: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => {
          const Icon = SYSTEM_STYLE[tpl.system].icon;
          const on = chosen.has(tpl.key);
          return (
            <label
              key={tpl.key}
              className={cn("flex cursor-pointer gap-3 rounded-md border p-3 text-sm", on ? "border-brand bg-brand/5" : "border-border")}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(tpl.key)} className="mt-0.5" />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon className="size-4 text-muted" />
                  {tpl.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {tpl.description} · {t("stepCount", { count: tpl.steps })}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <Button className="mt-4" disabled={pending || chosen.size === 0} onClick={() => start(() => installTemplatesAction([...chosen]))}>
        {t("installTemplates", { count: chosen.size })}
      </Button>
    </div>
  );
}
