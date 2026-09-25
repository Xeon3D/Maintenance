"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, FileUp } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { SystemBadge } from "@/components/badges";
import type { SystemType } from "@/generated/prisma/enums";
import { commitImportAction, previewImportAction, type ImportPreview } from "./actions";

export function Importer({ villas }: { villas: Record<string, string> }) {
  const t = useTranslations("import");
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(file: File) {
    setCreated(null);
    setFailed(false);
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    start(async () => {
      try {
        setPreview(await previewImportAction(text));
      } catch {
        setFailed(true);
      }
    });
  }

  if (created !== null) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CircleCheck className="size-10 text-green-600" />
        <p className="mt-3 font-medium">{t("done", { count: created })}</p>
        <Link href="/assets" className="mt-4">
          <Button>{t("viewAssets")}</Button>
        </Link>
      </div>
    );
  }

  const errorText = (e: ImportPreview["errors"][number]) =>
    (e.row ? t("rowPrefix", { row: e.row }) + " " : "") + t(`errors.${e.message}` as never, (e.params ?? {}) as never);

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-10 text-center hover:border-brand/50">
        <FileUp className="size-8 text-muted" />
        <span className="mt-2 text-sm font-medium">{fileName || t("choose")}</span>
        <span className="text-xs text-muted">CSV · UTF-8</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {pending && <p className="text-sm text-muted">{t("checking")}</p>}
      <FormError message={failed ? t("failed") : null} />

      {preview && !pending && (
        <>
          {preview.errors.length > 0 ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-danger">
                <CircleAlert className="size-4" />
                {t("hasErrors", { count: preview.errors.length })}
              </p>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm text-red-900">
                {preview.errors.map((e, i) => (
                  <li key={i}>{errorText(e)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                {t("summary", { rows: preview.rowCount, villas: preview.villas, areas: preview.newAreas })}
              </p>
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {preview.sample.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>
                      {r.name}
                      <span className="ml-2 text-xs text-muted">
                        {villas[r.villaId]}
                        {r.area && ` · ${r.area}`}
                      </span>
                    </span>
                    <SystemBadge system={r.system as SystemType} />
                  </li>
                ))}
                {preview.rowCount > preview.sample.length && (
                  <li className="px-3 py-2 text-xs text-muted">{t("andMore", { count: preview.rowCount - preview.sample.length })}</li>
                )}
              </ul>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      const res = await commitImportAction(csv!);
                      if (res.errors) setPreview({ ...preview, errors: res.errors });
                      else setCreated(res.created ?? 0);
                    } catch {
                      setFailed(true);
                    }
                  })
                }
              >
                {t("confirm", { count: preview.rowCount })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
