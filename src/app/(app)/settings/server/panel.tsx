"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { Badge, Button, FormError, Table } from "@/components/ui";
import type { FormResult } from "@/lib/forms";
import { backupNowAction, deleteBackupAction, restoreBackupAction, updateNowAction } from "./actions";

function useErrorText() {
  const t = useTranslations();
  return (r: FormResult) => (r?.error ? (t.has(r.error as never) ? t(r.error as never) : t("common.somethingWrong")) : null);
}

/** Waits for the server to come back (optionally on a different version), then reloads. */
async function waitForServer(fromVersion: string | null, onTick?: (s: number) => void) {
  const started = Date.now();
  await new Promise((r) => setTimeout(r, 4000));
  while (Date.now() - started < 10 * 60_000) {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (res.ok) {
        const { version } = (await res.json()) as { version: string };
        if (!fromVersion || version !== fromVersion) return location.reload();
      }
    } catch {
      /* still restarting */
    }
    onTick?.(Math.round((Date.now() - started) / 1000));
    await new Promise((r) => setTimeout(r, 3000));
  }
  location.reload();
}

function Waiting({ text, seconds }: { text: string; seconds: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-sm rounded-lg bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <p className="text-sm">{text}</p>
        {seconds > 0 && <p className="mt-2 text-xs text-muted">{seconds}s</p>}
      </div>
    </div>
  );
}

export function UpdateButton({ current, latest }: { current: string; latest: string }) {
  const t = useTranslations("server");
  const errorText = useErrorText();
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        disabled={pending || waiting !== null}
        onClick={() =>
          confirm(t("updateConfirm", { version: latest })) &&
          start(async () => {
            setError(null);
            const r = await updateNowAction();
            if (!r?.ok) return setError(errorText(r));
            setWaiting(0);
            await waitForServer(current, setWaiting);
          })
        }
      >
        {pending ? t("preparingUpdate") : t("updateTo", { version: latest })}
      </Button>
      <FormError message={error} />
      {waiting !== null && <Waiting text={t("updating")} seconds={waiting} />}
    </>
  );
}

export function BackupNowButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("server");
  const errorText = useErrorText();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await backupNowAction();
            if (!r?.ok) setError(errorText(r));
            router.refresh();
          })
        }
      >
        {pending ? t("backingUp") : t("backupNow")}
      </Button>
      <FormError message={error} />
    </div>
  );
}

export function UploadBackup({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("server");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error: string | null; progress: number }>({ busy: false, error: null, progress: 0 });

  const send = (file: File) => {
    setState({ busy: true, error: null, progress: 0 });
    // XHR for upload progress; the body is streamed to disk by the route.
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", "/api/server/backups/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      setState({ busy: false, progress: 0, error: ok ? null : xhr.status === 413 ? t("errors.tooLarge") : t("errors.invalidBackup") });
      if (input.current) input.current.value = "";
      router.refresh();
    };
    xhr.onerror = () => setState({ busy: false, progress: 0, error: t("errors.failed") });
    xhr.send(file);
  };

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept=".tar.gz,.tgz,application/gzip" className="sr-only" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
      <Button variant="secondary" disabled={disabled || state.busy} onClick={() => input.current?.click()}>
        <Upload className="size-4" />
        {state.busy ? t("uploading", { progress: state.progress }) : t("uploadBackup")}
      </Button>
      <FormError message={state.error} />
    </div>
  );
}

export type BackupRow = { name: string; kind: string; createdAt: string; version: string; size: number };

const KIND_STYLE: Record<string, string> = {
  manual: "bg-blue-50 text-blue-800",
  uploaded: "bg-purple-50 text-purple-800",
  "pre-update": "bg-amber-50 text-amber-800",
  "pre-restore": "bg-amber-50 text-amber-800",
};

function size(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function BackupsTable({ rows, current, canRestore, timezone }: { rows: BackupRow[]; current: string; canRestore: boolean; timezone: string }) {
  const t = useTranslations("server");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone });

  const restore = (row: BackupRow) => {
    const typed = prompt(t("restoreConfirm", { date: fmt.format(new Date(row.createdAt)), version: row.version }));
    if (typed?.trim().toUpperCase() !== t("restoreWord")) return;
    start(async () => {
      setError(null);
      setRestoring(true);
      const r = await restoreBackupAction(row.name);
      setRestoring(false);
      if (!r?.ok) return setError(errorText(r));
      if (r.overridden?.length) alert(t("keysOverridden", { keys: r.overridden.join(", ") }));
      if (!r.restarting) return router.refresh();
      setWaiting(0);
      await waitForServer(null, setWaiting);
    });
  };

  if (rows.length === 0) return <p className="px-5 py-6 text-sm text-muted">{t("noBackups")}</p>;
  return (
    <>
      <FormError message={error} />
      <Table>
        <thead>
          <tr>
            <th>{t("date")}</th>
            <th>{t("kind")}</th>
            <th>{t("version")}</th>
            <th className="text-right">{t("size")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="whitespace-nowrap">{fmt.format(new Date(r.createdAt))}</td>
              <td>
                <Badge className={KIND_STYLE[r.kind]}>{t(`kinds.${r.kind}` as never)}</Badge>
              </td>
              <td className={r.version === current ? "" : "text-muted"}>{r.version}</td>
              <td className="whitespace-nowrap text-right tabular-nums">{size(r.size)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <a href={`/api/server/backups/${encodeURIComponent(r.name)}`} title={t("download")} className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-brand">
                    <Download className="size-4" />
                  </a>
                  {canRestore && (
                    <button type="button" title={t("restore")} disabled={pending} onClick={() => restore(r)} className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-brand disabled:opacity-50">
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    title={t("delete")}
                    disabled={pending}
                    onClick={() => confirm(t("deleteConfirm")) && start(() => deleteBackupAction(r.name))}
                    className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {restoring && <Waiting text={t("restoring")} seconds={0} />}
      {waiting !== null && <Waiting text={t("restarting")} seconds={waiting} />}
    </>
  );
}
