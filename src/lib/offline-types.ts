// Shapes exchanged between the offline field app (/m) and /api/offline/*. No server imports.

import type { ChecklistItemType, Priority, WorkOrderStatus, WorkOrderType } from "@/generated/prisma/enums";

export type OfflineItem = {
  id: string;
  type: ChecklistItemType;
  label: string;
  description: string | null;
  required: boolean;
  options: string[];
  unit: string | null;
  value: string | null;
  note: string | null;
  completedBy: string | null;
};

export type OfflineWorkOrder = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: Priority;
  type: WorkOrderType;
  dueDate: string | null;
  villa: { name: string; address: string | null; city: string | null; accessNotes: string | null } | null;
  area: string | null;
  asset: { id: string; name: string; details: string | null } | null;
  items: OfflineItem[];
  comments: { id: string; user: string; body: string; at: string }[];
  minutesLogged: number;
};

export type Snapshot = {
  at: string;
  user: { id: string; name: string };
  workOrders: OfflineWorkOrder[];
  /** Assets at the villas in the snapshot, so a scanned QR label resolves offline. */
  assets: { id: string; name: string; qrToken: string; villa: string }[];
  members: { id: string; name: string }[];
};

type Base = { id: string; woId: string; at: string };

export type SyncOp =
  | (Base & { kind: "answer"; itemId: string; value: string | null; note?: string | null })
  | (Base & { kind: "comment"; body: string })
  | (Base & { kind: "time"; startedAt: string; endedAt: string; note?: string | null })
  | (Base & { kind: "status"; status: WorkOrderStatus; note?: string | null });

/** A queued change on the device. Photos and signatures are uploaded first, then become an answer (or stay a gallery photo). */
export type QueuedOp = SyncOp | (Base & { kind: "photo"; itemId: string | null; blobKey: string; filename: string });

/** "retry" = not applied (server hiccup); keep it queued and try again later. */
export type SyncResult = { id: string; status: "applied" | "stale" | "rejected" | "retry"; error?: string };

/** A change as the UI creates it; the queue adds the id and timestamp. */
export type NewOp = QueuedOp extends infer T ? (T extends QueuedOp ? Omit<T, "id" | "at"> & { at?: string } : never) : never;
