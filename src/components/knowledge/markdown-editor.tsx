"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Markdown } from "@/components/markdown";
import { Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Article text with a Write / Preview switch and a one-line formatting cheat sheet. Submits as `name`. */
export function MarkdownEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const t = useTranslations("knowledge");
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const tab = (on: boolean) => cn("rounded-md px-3 py-1 text-sm", on ? "bg-gray-100 font-medium" : "text-muted hover:text-foreground");
  return (
    <div>
      <div className="mb-2 flex gap-1">
        <button type="button" className={tab(!preview)} onClick={() => setPreview(false)}>
          {t("write")}
        </button>
        <button type="button" className={tab(preview)} onClick={() => setPreview(true)}>
          {t("preview")}
        </button>
      </div>
      {/* Stays mounted while previewing, so the text is still submitted. */}
      <Textarea name={name} value={value} onChange={(e) => setValue(e.target.value)} rows={18} className={cn("font-mono text-sm", preview && "hidden")} />
      {preview && (
        <div className="min-h-40 rounded-md border border-border px-4 py-3">
          {value.trim() ? <Markdown source={value} /> : <p className="text-sm text-muted">{t("nothingToPreview")}</p>}
        </div>
      )}
      <p className="mt-1 text-xs text-muted">{t("formatHint")}</p>
    </div>
  );
}
