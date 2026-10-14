// Billed time on work orders: each technician's time on a work order is rounded up to whole blocks of the
// company's billing period (Settings → Organization, default 30 minutes), so 34 minutes bill as 1 hour.
// The minutes actually logged are kept as they are (utilisation, the work order's time list); only what is
// charged — labour cost, billed hours, the client's service report — uses the rounded time.

export const TIME_ROUNDING_OPTIONS = [0, 15, 30, 60] as const;
export const DEFAULT_TIME_ROUNDING = 30;

/** A stored block size, or the default when it isn't one of the options. */
export const timeRoundingOf = (v: unknown) =>
  v !== null && v !== undefined && v !== "" && (TIME_ROUNDING_OPTIONS as readonly number[]).includes(Number(v)) ? Number(v) : DEFAULT_TIME_ROUNDING;

/** Minutes rounded up to whole blocks (block 0 = no rounding). */
export function roundUpMinutes(minutes: number, block: number) {
  if (!block || minutes <= 0) return minutes;
  return Math.ceil(minutes / block) * block;
}

export type TimeEntryLike = { userId?: string | null; minutes: number | null; hourlyRate: unknown };
export type PersonTime = { userId: string; minutes: number; billed: number; labor: number };

/**
 * Time on one work order, per technician: minutes logged, minutes billed (rounded up per person) and labour.
 * Labour is each entry's own rate × its minutes, scaled to the person's billed time (a person whose rate
 * changed between entries keeps the mix). Running timers (no minutes yet) don't count.
 */
export function billedTime(entries: TimeEntryLike[], block: number) {
  const by = new Map<string, { minutes: number; rated: number }>();
  for (const e of entries) {
    const m = e.minutes ?? 0;
    if (m <= 0) continue;
    const key = e.userId ?? "-";
    const acc = by.get(key) ?? { minutes: 0, rated: 0 };
    acc.minutes += m;
    acc.rated += m * Number(e.hourlyRate ?? 0);
    by.set(key, acc);
  }
  const people: PersonTime[] = [...by].map(([userId, { minutes, rated }]) => {
    const billed = roundUpMinutes(minutes, block);
    return { userId, minutes, billed, labor: (rated / 60) * (billed / minutes) };
  });
  return {
    people,
    minutes: people.reduce((s, p) => s + p.minutes, 0),
    billed: people.reduce((s, p) => s + p.billed, 0),
    labor: people.reduce((s, p) => s + p.labor, 0),
  };
}
