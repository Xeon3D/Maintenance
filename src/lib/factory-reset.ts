import "server-only";
import { prisma } from "@/lib/db/client";
import { clearAllObjects } from "@/lib/storage";
import { seedDemo } from "@/lib/demo-seed";
import { AttemptLimiter, samePassword } from "@/lib/attempt-limit";

// "Factory reset" for demo/test servers: erases every organization, user and file, then re-creates
// the demo data. Only available when FACTORY_RESET_PASSWORD is set; keep that value out of the repo.

export function factoryResetEnabled() {
  return !!process.env.FACTORY_RESET_PASSWORD;
}

export function checkFactoryResetPassword(input: string) {
  return samePassword(input, process.env.FACTORY_RESET_PASSWORD);
}

const limiter = new AttemptLimiter();
export const factoryResetBlocked = (client: string, now = Date.now()) => limiter.blocked(client, now);
export const recordFactoryResetFailure = (client: string, now = Date.now()) => limiter.fail(client, now);

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
    limiter.reset();
  } finally {
    running = false;
  }
}
