export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await seedOnFirstStart();
  startScheduler();
}

// Docker/demo servers: with SEED_DEMO=true an empty database gets the demo organization on first start.
async function seedOnFirstStart() {
  if (process.env.SEED_DEMO !== "true") return;
  try {
    const { prisma } = await import("@/lib/db/client");
    if (await prisma.organization.count()) return;
    const { seedDemo, DEMO_OWNER, DEMO_PASSWORD } = await import("@/lib/demo-seed");
    if (await seedDemo(prisma)) console.log(`[seed] demo data created: sign in with ${DEMO_OWNER} / ${DEMO_PASSWORD}`);
  } catch (e) {
    console.error("[seed] demo seed failed", e);
  }
}

// Optional in-process scheduler for self-hosted/dev servers. On serverless hosts leave
// SCHEDULER_INTERVAL_MINUTES unset and call /api/cron/pm from a cron service instead.
async function startScheduler() {
  const minutes = Number(process.env.SCHEDULER_INTERVAL_MINUTES);
  if (!minutes || minutes <= 0) return;

  const { runDueSchedules } = await import("@/lib/pm");
  const tick = async () => {
    try {
      const r = await runDueSchedules();
      if (r.created) console.log(`[pm] generated ${r.created} preventive work order(s)`);
    } catch (e) {
      console.error("[pm] scheduler run failed", e);
    }
  };
  const g = globalThis as unknown as { __pmTimer?: NodeJS.Timeout };
  if (g.__pmTimer) clearInterval(g.__pmTimer); // dev hot reload
  g.__pmTimer = setInterval(tick, minutes * 60_000);
  setTimeout(tick, 10_000);
}
