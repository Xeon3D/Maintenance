"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { runSchedulerNowAction } from "./actions";

/** Runs the PM scheduler for this organization immediately. */
export function RunSchedulerButton() {
  const t = useTranslations("pm");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-2">
      {result !== null && <span className="text-sm text-muted">{t("runResult", { count: result })}</span>}
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => setResult((await runSchedulerNowAction()).created))}>
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
        {t("runNow")}
      </Button>
    </div>
  );
}
