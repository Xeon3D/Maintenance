"use client";

// Minimal promise wrapper over IndexedDB for the field app. Three stores:
//  kv     — snapshot, sync issues, running timers (keys are prefixed with the user id)
//  queue  — changes waiting to sync ({ id, userId, seq, op })
//  blobs  — photos and signatures captured offline, until uploaded

const DB = "villaops-field";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" }).createIndex("userId", "userId");
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const kv = {
  get: <T>(key: string) => run<T | undefined>("kv", "readonly", (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => run("kv", "readwrite", (s) => s.put(value, key)),
  del: (key: string) => run("kv", "readwrite", (s) => s.delete(key)),
};

export type QueueRow<T> = { id: string; userId: string; seq: number; op: T };

export const queue = {
  all: async <T>(userId: string) => {
    const rows = await run<QueueRow<T>[]>("queue", "readonly", (s) => s.index("userId").getAll(userId) as IDBRequest<QueueRow<T>[]>);
    return rows.sort((a, b) => a.seq - b.seq);
  },
  put: <T>(row: QueueRow<T>) => run("queue", "readwrite", (s) => s.put(row)),
  del: (id: string) => run("queue", "readwrite", (s) => s.delete(id)),
};

export const blobs = {
  get: (key: string) => run<Blob | undefined>("blobs", "readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>),
  set: (key: string, blob: Blob) => run("blobs", "readwrite", (s) => s.put(blob, key)),
  del: (key: string) => run("blobs", "readwrite", (s) => s.delete(key)),
};

/** Unique, time-ordered ids for queued changes (also the server's idempotency key). */
export function newId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
