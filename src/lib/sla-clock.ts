import { fromWall, toWall } from "@/lib/pm-schedule";

// The SLA clock: how much "SLA time" passes between two instants. Contracts can count only the
// company's business hours (opening times per weekday, minus holidays, in its time zone) and can stop
// the clock while a job is on hold (waiting for the client, parts…). Pure, so it is unit-tested.

const MIN = 60_000;
const DAY = 86_400_000;
/** How far ahead a due date is searched for (a calendar with almost no open hours could loop forever). */
const LIMIT_DAYS = 3 * 366;

export type DayHours = { start: string; end: string } | null; // "HH:MM", end after start; null = closed
export type BusinessHours = { days: DayHours[]; holidays: string[] }; // days[0] = Sunday; holidays "YYYY-MM-DD"
export type Pause = { from: Date; to: Date | null }; // to = null: still paused

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: [null, ...Array.from({ length: 5 }, () => ({ start: "09:00", end: "18:00" })), null],
  holidays: [],
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Valid business hours from stored JSON, else the default (Mon–Fri 09:00–18:00). */
export function parseBusinessHours(raw: unknown): BusinessHours {
  const o = raw && typeof raw === "object" ? (raw as { days?: unknown; holidays?: unknown }) : {};
  if (!Array.isArray(o.days) || o.days.length !== 7) return DEFAULT_BUSINESS_HOURS;
  const days = o.days.map((d): DayHours => {
    if (!d || typeof d !== "object") return null;
    const { start, end } = d as { start?: unknown; end?: unknown };
    return typeof start === "string" && typeof end === "string" && TIME.test(start) && TIME.test(end) && minutesOf(end) > minutesOf(start) ? { start, end } : null;
  });
  const holidays = Array.isArray(o.holidays) ? o.holidays.filter((h): h is string => typeof h === "string" && DATE.test(h)) : [];
  return { days, holidays: [...new Set(holidays)].sort() };
}

/** On-hold periods from a job's status changes (oldest first). */
export function holdPeriods(logs: { toStatus: string; createdAt: Date }[]): Pause[] {
  const out: Pause[] = [];
  let since: Date | null = null;
  for (const l of [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (l.toStatus === "ON_HOLD") since ??= l.createdAt;
    else if (since) {
      out.push({ from: since, to: l.createdAt });
      since = null;
    }
  }
  if (since) out.push({ from: since, to: null });
  return out;
}

export type Clock = { timeZone: string; hours: BusinessHours | null; pauses: Pause[] };

/** Open windows [a, b) from `start` onwards: business-hours slots, or one endless window for 24/7. */
function* windows(start: Date, clock: Clock): Generator<[number, number]> {
  const t0 = start.getTime();
  if (!clock.hours) {
    yield [t0, t0 + LIMIT_DAYS * DAY];
    return;
  }
  const holidays = new Set(clock.hours.holidays);
  const wall = toWall(start, clock.timeZone);
  const day0 = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
  for (let i = 0; i < LIMIT_DAYS; i++) {
    const day = new Date(day0 + i * DAY);
    const hours = clock.hours.days[day.getUTCDay()];
    if (!hours || holidays.has(day.toISOString().slice(0, 10))) continue;
    const a = Math.max(t0, fromWall(new Date(day.getTime() + minutesOf(hours.start) * MIN), clock.timeZone).getTime());
    const b = fromWall(new Date(day.getTime() + minutesOf(hours.end) * MIN), clock.timeZone).getTime();
    if (b > a) yield [a, b];
  }
}

/** Parts of [a, b) outside every pause; Infinity marks an open-ended pause reached inside it. */
function unpaused(a: number, b: number, pauses: Pause[]): [number, number][] {
  const out: [number, number][] = [];
  let cur = a;
  for (const p of pauses) {
    const pa = p.from.getTime();
    const pb = p.to ? p.to.getTime() : Infinity;
    if (pb <= cur || pa >= b) continue;
    if (pa > cur) out.push([cur, pa]);
    cur = Math.max(cur, pb);
    if (cur >= b) break;
  }
  if (cur < b) out.push([cur, b]);
  return out;
}

/**
 * The instant at which `ms` of SLA time has passed since `start`, or null when it never does: the job is
 * paused indefinitely before then, or the calendar has no open hours within the search limit.
 */
export function addSlaTime(start: Date, ms: number, clock: Clock): Date | null {
  const pauses = [...clock.pauses].sort((x, y) => x.from.getTime() - y.from.getTime());
  const openPause = pauses.find((p) => !p.to);
  let left = ms;
  for (const [a, b] of windows(start, clock)) {
    if (openPause && openPause.from.getTime() <= a) return null;
    for (const [x, y] of unpaused(a, b, pauses)) {
      if (y - x >= left) return new Date(x + left);
      left -= y - x;
    }
  }
  return null;
}

/**
 * Reads the Settings → Organization business-hours fields (open<d>, start<d>, end<d> for d = 0–6, holidays
 * one date per line). Returns field errors (message keys) for a closing time not after the opening time
 * or a malformed holiday.
 */
export function businessHoursFromForm(get: (name: string) => string | null): { hours: BusinessHours } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const days = Array.from({ length: 7 }, (_, d): DayHours => {
    if (get(`open${d}`) !== "on") return null;
    const start = get(`start${d}`) ?? "";
    const end = get(`end${d}`) ?? "";
    if (!TIME.test(start) || !TIME.test(end) || minutesOf(end) <= minutesOf(start)) {
      errors[`end${d}`] = "closesBeforeOpens";
      return null;
    }
    return { start, end };
  });
  const lines = (get("holidays") ?? "").split(/[\s,;]+/).filter(Boolean);
  const valid = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
  if (lines.some((l) => !valid(l))) errors.holidays = "badHoliday";
  if (lines.length > 500) errors.holidays = "too_big";
  return Object.keys(errors).length ? { errors } : { hours: { days, holidays: [...new Set(lines)].sort() } };
}
