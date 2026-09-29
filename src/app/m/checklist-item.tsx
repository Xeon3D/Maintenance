"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Check, PenLine } from "lucide-react";
import { Button } from "@/components/ui";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { shrinkImage } from "@/lib/upload-client";
import { blobs, newId } from "@/lib/offline/idb";
import { PENDING_PHOTO } from "@/lib/offline/apply";
import type { NewOp, OfflineItem } from "@/lib/offline-types";
import { cn } from "@/lib/utils";

type Enqueue = (op: NewOp, blob?: Blob) => Promise<void>;

/** A photo still on the device (shown from IndexedDB) or already uploaded (from the server). */
function Thumb({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!value.startsWith(PENDING_PHOTO)) return;
    let url: string | null = null;
    blobs.get(value.slice(PENDING_PHOTO.length)).then((b) => {
      if (b) setSrc((url = URL.createObjectURL(b)));
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [value]);
  const shown = value.startsWith(PENDING_PHOTO) ? src : `/api/files/${value}`;
  // eslint-disable-next-line @next/next/no-img-element
  return shown ? <img src={shown} alt="" className="mt-2 h-24 rounded-md border border-border bg-white object-contain" /> : null;
}

export function ChecklistItemInput({ item, woId, locked, enqueue }: { item: OfflineItem; woId: string; locked: boolean; enqueue: Enqueue }) {
  const t = useTranslations();
  const [draft, setDraft] = useState(item.value ?? "");
  const [signing, setSigning] = useState(false);
  const [signEmpty, setSignEmpty] = useState(true);
  const pad = useRef<SignaturePadHandle>(null);
  const photo = useRef<HTMLInputElement>(null);
  const answer = (value: string | null) => enqueue({ kind: "answer", woId, itemId: item.id, value });

  if (item.type === "HEADING") return <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</h3>;

  const pendingUpload = item.value?.startsWith(PENDING_PHOTO);
  const choice = (v: string, label: string, tone = "") => (
    <button
      key={v}
      disabled={locked}
      onClick={() => answer(item.value === v ? null : v)}
      className={cn("h-11 min-w-16 rounded-md border px-3 text-sm font-medium", item.value === v ? tone || "border-brand bg-brand text-white" : "border-border bg-surface")}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <label className="text-sm font-medium">
          {item.label}
          {item.required && <span className="ml-1 text-danger">*</span>}
        </label>
        {item.completedBy && <span className="shrink-0 text-xs text-muted">{t("checklist.answeredBy", { name: item.completedBy })}</span>}
      </div>
      {item.description && <p className="mb-1 text-xs text-muted">{item.description}</p>}

      <div className="mt-2">
        {item.type === "CHECKBOX" && (
          <button
            disabled={locked}
            onClick={() => answer(item.value === "true" ? "false" : "true")}
            className={cn("flex h-11 items-center gap-2 rounded-md border px-3 text-sm", item.value === "true" ? "border-green-600 bg-green-50 text-green-800" : "border-border bg-surface")}
          >
            <span className={cn("flex size-5 items-center justify-center rounded border", item.value === "true" ? "border-green-600 bg-green-600 text-white" : "border-gray-400")}>
              {item.value === "true" && <Check className="size-3.5" />}
            </span>
            {t("checklist.yes")}
          </button>
        )}

        {item.type === "PASS_FAIL" && (
          <div className="flex gap-2">
            {choice("PASS", t("checklist.pf.PASS"), "border-green-600 bg-green-600 text-white")}
            {choice("FLAG", t("checklist.pf.FLAG"), "border-amber-500 bg-amber-500 text-white")}
            {choice("FAIL", t("checklist.pf.FAIL"), "border-red-600 bg-red-600 text-white")}
          </div>
        )}

        {item.type === "MULTIPLE_CHOICE" && <div className="flex flex-wrap gap-2">{item.options.map((o) => choice(o, o))}</div>}

        {(item.type === "TEXT" || item.type === "NUMBER" || item.type === "METER_READING") && (
          <div className="flex items-center gap-2">
            {item.type === "TEXT" ? (
              <textarea
                value={draft}
                disabled={locked}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft.trim() !== (item.value ?? "") && answer(draft.trim() || null)}
                rows={2}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            ) : (
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={draft}
                disabled={locked}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft !== (item.value ?? "") && answer(draft === "" ? null : draft)}
                className="h-11 w-36 rounded-md border border-border px-3 text-sm"
              />
            )}
            {item.unit && <span className="text-sm text-muted">{item.unit}</span>}
          </div>
        )}

        {item.type === "PHOTO" && (
          <>
            <input
              ref={photo}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const small = await shrinkImage(f);
                await enqueue({ kind: "photo", woId, itemId: item.id, blobKey: newId(), filename: small.name }, small);
              }}
            />
            <Button size="sm" variant="secondary" disabled={locked} onClick={() => photo.current?.click()}>
              <Camera className="size-4" />
              {item.value ? t("field.retake") : t("field.takePhoto")}
            </Button>
          </>
        )}

        {item.type === "SIGNATURE" &&
          (signing ? (
            <div className="space-y-2">
              <SignaturePad ref={pad} onChange={setSignEmpty} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={signEmpty}
                  onClick={async () => {
                    const blob = await pad.current!.toBlob();
                    if (!blob) return;
                    await enqueue({ kind: "photo", woId, itemId: item.id, blobKey: newId(), filename: "signature.png" }, blob);
                    setSigning(false);
                  }}
                >
                  {t("checklist.saveSignature")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => pad.current?.clear()}>
                  {t("checklist.clear")}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" disabled={locked} onClick={() => setSigning(true)}>
              <PenLine className="size-4" />
              {t("checklist.sign")}
            </Button>
          ))}

        {(item.type === "PHOTO" || item.type === "SIGNATURE") && item.value && (
          <>
            <Thumb value={item.value} />
            {pendingUpload && <p className="mt-1 text-xs text-muted">{t("field.savedOnDevice")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
