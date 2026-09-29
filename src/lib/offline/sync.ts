"use client";

import type { QueuedOp, Snapshot, SyncOp, SyncResult } from "@/lib/offline-types";
import { uploadFile } from "@/lib/upload-client";
import { blobs, kv, queue, type QueueRow } from "./idb";

export type SyncIssue = { id: string; woId: string; kind: string; error: string; at: string };
export type SyncOutcome = { state: "ok" | "offline" | "signedOut" | "failed"; sent: number; snapshot?: Snapshot };

const BATCH = 50;
const snapshotKey = (userId: string) => `snapshot:${userId}`;
const issuesKey = (userId: string) => `issues:${userId}`;

export const loadSnapshot = (userId: string) => kv.get<Snapshot>(snapshotKey(userId));
export const loadIssues = async (userId: string) => (await kv.get<SyncIssue[]>(issuesKey(userId))) ?? [];
export const clearIssues = (userId: string) => kv.del(issuesKey(userId));

async function addIssue(userId: string, op: QueuedOp, error: string) {
  const list = await loadIssues(userId);
  await kv.set(issuesKey(userId), [{ id: op.id, woId: op.woId, kind: op.kind, error, at: new Date().toISOString() }, ...list].slice(0, 50));
}

/** A redirect to the login page (or an HTML answer) means the session expired. */
function signedOut(res: Response) {
  return res.redirected && new URL(res.url).pathname.startsWith("/login");
}

/**
 * Sends queued changes in order, then refreshes the snapshot. Photos/signatures are uploaded first and
 * become answers. Stops at the first thing that can't be sent now; the rest stays queued.
 */
export async function syncNow(userId: string): Promise<SyncOutcome> {
  if (!navigator.onLine) return { state: "offline", sent: 0 };
  let sent = 0;
  let batch: QueueRow<QueuedOp>[] = [];

  const flush = async (): Promise<SyncOutcome["state"] | null> => {
    if (!batch.length) return null;
    const res = await fetch("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops: batch.map((r) => r.op as SyncOp) }),
    }).catch(() => null);
    if (!res) return "offline";
    if (signedOut(res) || res.status === 401) return "signedOut";
    if (!res.ok) return "failed";
    const { results } = (await res.json()) as { results: SyncResult[] };
    const byId = new Map(results.map((r) => [r.id, r]));
    for (const row of batch) {
      const r = byId.get(row.id);
      if (!r || r.status === "retry") return "failed";
      if (r.status === "rejected") await addIssue(userId, row.op, r.error ?? "somethingWrong");
      await queue.del(row.id);
      sent++;
    }
    batch = [];
    return null;
  };

  for (const row of await queue.all<QueuedOp>(userId)) {
    const op = row.op;
    if (op.kind !== "photo") {
      batch.push(row);
      if (batch.length >= BATCH) {
        const stop = await flush();
        if (stop) return { state: stop, sent };
      }
      continue;
    }
    const stop = await flush();
    if (stop) return { state: stop, sent };
    const blob = await blobs.get(op.blobKey);
    if (!blob) {
      await queue.del(row.id);
      continue;
    }
    let uploadedId: string;
    try {
      const file = new File([blob], op.filename, { type: blob.type });
      uploadedId = (await uploadFile(file, op.itemId ? { workOrderItemId: op.itemId } : { workOrderId: op.woId })).id;
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      // The record is gone or not ours: drop it. Anything else (network) is retried later.
      if (["notFound", "forbidden", "badTarget", "badType", "tooLarge"].includes(code)) {
        await addIssue(userId, op, `files.${code}`);
        await queue.del(row.id);
        await blobs.del(op.blobKey);
        continue;
      }
      return { state: navigator.onLine ? "failed" : "offline", sent };
    }
    await blobs.del(op.blobKey);
    if (op.itemId) {
      // The photo is on the server now; answering the checklist item is an ordinary change.
      const answer: QueueRow<QueuedOp> = { ...row, op: { id: row.id, kind: "answer", woId: op.woId, itemId: op.itemId, value: uploadedId, at: op.at } };
      await queue.put(answer);
      batch.push(answer);
    } else {
      await queue.del(row.id);
      sent++;
    }
  }
  const stop = await flush();
  if (stop) return { state: stop, sent };

  const res = await fetch("/api/offline/snapshot", { cache: "no-store" }).catch(() => null);
  if (!res) return { state: "offline", sent };
  if (signedOut(res) || res.status === 401) return { state: "signedOut", sent };
  if (!res.ok) return { state: "failed", sent };
  const snapshot = (await res.json()) as Snapshot;
  await kv.set(snapshotKey(userId), snapshot);
  return { state: "ok", sent, snapshot };
}
