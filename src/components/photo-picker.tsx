"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, X } from "lucide-react";
import { shrinkImage } from "@/lib/upload-client";

/**
 * Collects up to `max` photos (downsized in the browser) for forms that submit files
 * in FormData. The parent reads them through `onChange`.
 */
export function PhotoPicker({ max = 4, onChange }: { max?: number; onChange: (files: File[]) => void }) {
  const t = useTranslations("portal");
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const update = (next: { file: File; url: string }[]) => {
    setFiles(next);
    onChange(next.map((f) => f.file));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={f.url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="size-20 rounded-md border border-border object-cover" />
            <button
              type="button"
              aria-label={t("removePhoto")}
              onClick={() => update(files.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-xs text-muted hover:border-brand/50"
          >
            <Camera className="size-5" />
            {busy ? "…" : t("addPhoto")}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={async (e) => {
          const picked = [...(e.target.files ?? [])].slice(0, max - files.length);
          e.target.value = "";
          setBusy(true);
          const shrunk = await Promise.all(picked.map(shrinkImage));
          setBusy(false);
          update([...files, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
        }}
      />
    </div>
  );
}
