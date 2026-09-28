"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { recordReadingAction } from "./actions";

/** Compact "record a reading" input used on the meters list and asset page. */
export function ReadingInput({ meterId, unit }: { meterId: string; unit: string }) {
  const t = useTranslations("meters");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        start(async () => {
          const res = await recordReadingAction(meterId, value);
          if (res.error) setMsg({ tone: "err", text: t("invalidReading") });
          else {
            setValue("");
            setMsg({
              tone: res.outOfRange ? "warn" : "ok",
              text: [res.outOfRange ? t("outOfRangeSaved") : t("saved"), res.created ? t("woCreated", { count: res.created }) : null].filter(Boolean).join(" · "),
            });
          }
        });
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        placeholder={t("newReading")}
        className="h-8 w-24 rounded-md border border-border px-2 text-sm"
      />
      <span className="text-xs text-muted">{unit}</span>
      <button disabled={pending || !value.trim()} className="rounded-md bg-brand p-1.5 text-brand-foreground disabled:opacity-40" aria-label={t("record")}>
        <Check className="size-3.5" />
      </button>
      {msg && (
        <span className={msg.tone === "err" ? "text-xs text-danger" : msg.tone === "warn" ? "text-xs font-medium text-amber-700" : "text-xs text-green-700"}>
          {msg.text}
        </span>
      )}
    </form>
  );
}
