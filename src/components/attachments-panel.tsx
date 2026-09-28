"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { uploadFile, type UploadTarget } from "@/lib/upload-client";

export type PanelFile = { id: string; url: string; filename: string; mimeType: string };

/** Thumbnail grid with upload and delete, for records whose files aren't tied to a work order. */
export function AttachmentsPanel({
  target,
  files,
  canEdit,
  onDelete,
  accept = "image/*,application/pdf",
}: {
  target: UploadTarget;
  files: PanelFile[];
  canEdit: boolean;
  onDelete: (attachmentId: string) => Promise<void>;
  accept?: string;
}) {
  const t = useTranslations();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div>
      {files.length > 0 ? (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {files.map((f) => (
            <div key={f.id} className="group relative">
              <a href={f.url} target="_blank" rel="noreferrer" title={f.filename}>
                {f.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.filename} className="aspect-square w-full rounded-md border border-border object-cover" />
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-gray-50 p-1 text-center text-[10px] text-muted">
                    <Paperclip className="size-4" />
                    <span className="line-clamp-2 break-all">{f.filename}</span>
                  </div>
                )}
              </a>
              {canEdit && (
                <button
                  className="absolute right-1 top-1 rounded bg-white/90 p-1 text-muted shadow sm:opacity-0 sm:group-hover:opacity-100"
                  disabled={pending}
                  title={t("common.delete")}
                  onClick={() => confirm(`${t("common.delete")}?`) && start(() => onDelete(f.id))}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !canEdit && <p className="text-sm text-muted">—</p>
      )}
      {canEdit && (
        <>
          <input
            ref={input}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            onChange={async (e) => {
              const list = [...(e.target.files ?? [])];
              e.target.value = "";
              setBusy(true);
              setError(false);
              try {
                for (const f of list) await uploadFile(f, target);
              } catch {
                setError(true);
              } finally {
                setBusy(false);
                router.refresh();
              }
            }}
          />
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            <ImagePlus className="size-4" />
            {busy ? t("checklist.uploading") : t("files.add")}
          </Button>
          {error && <p className="mt-2 text-xs text-danger">{t("files.failed")}</p>}
        </>
      )}
    </div>
  );
}
