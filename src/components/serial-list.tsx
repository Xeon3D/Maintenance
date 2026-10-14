"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, ScanLine, X } from "lucide-react";
import { Input } from "@/components/ui";
import { Scanner } from "@/components/scanner";

/**
 * Serial numbers of the units being installed: typed or read with the camera (barcode or label text), one per
 * unit at most. Submitted as `name` (one per line).
 */
export function SerialList({ name, max }: { name: string; max: number }) {
  const t = useTranslations("serials");
  const [serials, setSerials] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [scanning, setScanning] = useState(false);
  const full = serials.length >= Math.max(1, Math.ceil(max));
  const add = (s: string) => {
    const v = s.trim();
    if (v && !serials.includes(v) && !full) setSerials((xs) => [...xs, v]);
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={serials.join("\n")} />
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // add the serial, don't submit the form
              add(draft);
            }
          }}
          placeholder={full ? t("full") : t("placeholder")}
          disabled={full}
          aria-label={t("label")}
          className="font-mono"
        />
        <button type="button" onClick={() => add(draft)} disabled={!draft.trim() || full} className="rounded-md border border-border p-2 text-muted hover:text-brand disabled:opacity-40" aria-label={t("add")} title={t("add")}>
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => setScanning(true)} disabled={full} className="rounded-md border border-border p-2 text-muted hover:text-brand disabled:opacity-40" aria-label={t("scan")} title={t("scan")}>
          <ScanLine className="size-4" />
        </button>
      </div>
      {serials.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {serials.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-white/10">
              {s}
              <button type="button" onClick={() => setSerials((xs) => xs.filter((x) => x !== s))} className="text-muted hover:text-danger" aria-label={t("remove", { serial: s })}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {scanning && (
        <Scanner
          purpose="serial"
          onClose={() => setScanning(false)}
          onResult={(text) => {
            setScanning(false);
            add(text);
          }}
        />
      )}
    </div>
  );
}
