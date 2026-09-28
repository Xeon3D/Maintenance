// Optional in-process scheduler for self-hosted/dev servers. On serverless hosts leave
// SCHEDULER_INTERVAL_MINUTES unset and call /api/cron/pm from a cron service instead.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
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
