import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { clearAllObjects } from "@/lib/storage";
import { seedDemo } from "@/lib/demo-seed";

// "Factory reset" for demo/test servers: erases every organization, user and file, then re-creates
// the demo data. Only available when FACTORY_RESET_PASSWORD is set; keep that value out of the repo.

export function factoryResetEnabled() {
  return !!process.env.FACTORY_RESET_PASSWORD;
}

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

export function checkFactoryResetPassword(input: string) {
  const expected = process.env.FACTORY_RESET_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected)); // equal-length digests: no length leak
}

// Failed attempts per client address, plus a global cap, over a 15-minute window (in memory: one server process).
const WINDOW_MS = 15 * 60_000;
const PER_CLIENT = 5;
const GLOBAL = 30;
const failures = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

export function factoryResetBlocked(client: string, now = Date.now()) {
  return recent(client, now).length >= PER_CLIENT || recent("*", now).length >= GLOBAL;
}

export function recordFactoryResetFailure(client: string, now = Date.now()) {
  recent(client, now).push(now);
  recent("*", now).push(now);
}

let running = false;

/** Wipes all application tables (not the migration history) and stored files, then seeds the demo org. */
export async function factoryReset() {
  if (running) throw new Error("A factory reset is already running");
  running = true;
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
    if (tables.length) {
      const list = tables.map((t) => `"${t.tablename.replaceAll('"', '""')}"`).join(", ");
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
    await clearAllObjects();
    await seedDemo(prisma);
    failures.clear();
  } finally {
    running = false;
  }
}
