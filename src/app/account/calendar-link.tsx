"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Check, Copy, RefreshCw } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { calendarLinkAction } from "./actions";

/** The personal calendar feed: create the private link, copy it, open it in the calendar app, or replace it. */
export function CalendarLink({ url }: { url: string | null }) {
  const t = useTranslations("calendarFeed");
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const make = (confirmFirst: boolean) => {
    if (confirmFirst && !confirm(t("resetConfirm"))) return;
    start(async () => {
      await calendarLinkAction();
      setCopied(false);
    });
  };

  if (!url) {
    return (
      <Button type="button" onClick={() => make(false)} disabled={pending}>
        <CalendarPlus className="size-4" />
        {t("create")}
      </Button>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={url} readOnly onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label={t("link")} />
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={url.replace(/^https?:/, "webcal:")} className="inline-flex">
          <Button type="button" variant="secondary">
            <CalendarPlus className="size-4" />
            {t("open")}
          </Button>
        </a>
        <Button type="button" variant="secondary" onClick={() => make(true)} disabled={pending}>
          <RefreshCw className="size-4" />
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}
