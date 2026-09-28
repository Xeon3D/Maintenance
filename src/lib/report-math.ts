import type { AssetStatus } from "@/generated/prisma/enums";

// Pure aggregation helpers for reports (unit-tested). Dates are handled in UTC.

const DAY = 86_400_000;

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3_600_000;

export type Grain = "day" | "week" | "month";

/** Day buckets up to ~5 weeks, weeks up to ~6 months, months beyond. */
export function grainFor(from: Date, to: Date): Grain {
  const days = (to.getTime() - from.getTime()) / DAY;
  return days <= 35 ? "day" : days <= 190 ? "week" : "month";
}

function startOf(d: Date, grain: Grain) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (grain === "week") x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Monday
  if (grain === "month") x.setUTCDate(1);
  return x;
}

function next(d: Date, grain: Grain) {
  const x = new Date(d);
  if (grain === "day") x.setUTCDate(x.getUTCDate() + 1);
  else if (grain === "week") x.setUTCDate(x.getUTCDate() + 7);
  else x.setUTCMonth(x.getUTCMonth() + 1);
  return x;
}

/** Consecutive bucket start dates covering [from, to]. */
export function buckets(from: Date, to: Date, grain: Grain) {
  const out: Date[] = [];
  for (let d = startOf(from, grain); d <= to; d = next(d, grain)) out.push(d);
  return out;
}

/** Counts of each date series per bucket, e.g. created vs completed work orders. */
export function countByBucket(series: Record<string, (Date | null)[]>, from: Date, to: Date, grain = grainFor(from, to)) {
  const starts = buckets(from, to, grain);
  const index = new Map(starts.map((d, i) => [d.getTime(), i]));
  const counts = Object.fromEntries(Object.keys(series).map((k) => [k, starts.map(() => 0)]));
  for (const [k, dates] of Object.entries(series)) {
    for (const d of dates) {
      if (!d || d < from || d > to) continue;
      const i = index.get(startOf(d, grain).getTime());
      if (i !== undefined) counts[k][i]++;
    }
  }
  return { grain, starts, counts };
}

/** Sum a value per key, sorted descending. */
export function sumBy<T>(items: T[], key: (t: T) => string | null, value: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k === null) continue;
    m.set(k, (m.get(k) ?? 0) + value(it));
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Monday–Friday days in [from, to]. */
export function workingDays(from: Date, to: Date) {
  let n = 0;
  for (let d = startOf(from, "day"); d <= to; d = new Date(d.getTime() + DAY)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/**
 * Time an asset spent in any of `statuses` within [from, to], from its status log.
 * `initial` is its status when the window opened (the last log before `from`, else operational).
 */
export function timeInStatus(
  logs: { status: AssetStatus; createdAt: Date }[],
  initial: AssetStatus,
  from: Date,
  to: Date,
  statuses: AssetStatus[] = ["DOWN"],
) {
  let status = initial;
  let since = from;
  let total = 0;
  for (const l of [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (l.createdAt <= from) {
      status = l.status;
      continue;
    }
    if (l.createdAt > to) break;
    if (statuses.includes(status)) total += l.createdAt.getTime() - since.getTime();
    status = l.status;
    since = l.createdAt;
  }
  if (statuses.includes(status)) total += to.getTime() - since.getTime();
  return total;
}

/** Preventive work due in the period: done by the due date, done late, or still not done. */
export function pmCompliance(wos: { status: string; dueDate: Date | null; completedAt: Date | null }[]) {
  const due = wos.filter((w) => w.dueDate && w.status !== "CANCELLED");
  const onTime = due.filter((w) => w.completedAt && w.completedAt <= w.dueDate!).length;
  const late = due.filter((w) => w.status === "DONE").length - onTime;
  return { due: due.length, onTime, late, missed: due.length - onTime - late, pct: due.length ? onTime / due.length : null };
}
