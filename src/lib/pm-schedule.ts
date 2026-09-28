import type { Frequency } from "@/generated/prisma/enums";

// Pure recurrence math (no DB), shared by the scheduler, forms and calendar projections.
// With a `timeZone`, occurrences keep the start's local wall-clock time (09:00 stays 09:00
// across daylight-saving changes) and weekdays/month days are those of that zone.

export type Recurrence = {
  frequency: Frequency;
  interval: number; // every N units
  daysOfWeek: number[]; // WEEKLY only, 0 = Sunday
  startDate: Date;
  endDate: Date | null;
  timeZone?: string; // IANA zone; UTC when omitted
};

/** Offset (ms) of `timeZone` from UTC at instant `d`. */
function tzOffset(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return wall - Math.floor(d.getTime() / 1000) * 1000;
}

/** Instant → its wall-clock time in the zone, expressed as a UTC Date ("floating" time). */
const toWall = (d: Date, tz: string) => new Date(d.getTime() + tzOffset(d, tz));

/** Floating wall-clock time → the real instant in the zone. */
function fromWall(w: Date, tz: string) {
  let guess = w.getTime() - tzOffset(w, tz);
  guess = w.getTime() - tzOffset(new Date(guess), tz); // second pass settles DST boundaries
  return new Date(guess);
}

const DAY = 86_400_000;

function addMonthsClamped(start: Date, months: number): Date {
  const d = new Date(start);
  const day = start.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay)); // 31 Jan + 1 month → 28/29 Feb
  return d;
}

function weekStart(d: Date) {
  const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return s.getTime() - ((s.getUTCDay() + 6) % 7) * DAY; // Monday
}

/** First occurrence strictly after `after`, or null when the schedule has ended. */
export function nextOccurrence(r: Recurrence, after: Date): Date | null {
  if (!r.timeZone || r.timeZone === "UTC") return nextUtc(r, after);
  const tz = r.timeZone;
  const wallRule: Recurrence = { ...r, startDate: toWall(r.startDate, tz), endDate: null, timeZone: undefined };
  let wall = nextUtc(wallRule, toWall(after, tz));
  let result = wall && fromWall(wall, tz);
  // In the repeated hour of a DST fall-back, the mapped instant can land at/before `after`.
  if (result && wall && result <= after) {
    wall = nextUtc(wallRule, wall);
    result = wall && fromWall(wall, tz);
  }
  if (result && r.endDate && result > r.endDate) return null;
  return result;
}

function nextUtc(r: Recurrence, after: Date): Date | null {
  const interval = Math.max(1, r.interval);
  const start = r.startDate;
  let next: Date | null = null;

  if (after < start) {
    next = start;
    // A weekly schedule with weekdays starts on the first matching day on/after start.
    if (r.frequency === "WEEKLY" && r.daysOfWeek.length && !r.daysOfWeek.includes(start.getUTCDay())) {
      next = nextUtc(r, start);
    }
  } else if (r.frequency === "DAILY" || (r.frequency === "WEEKLY" && r.daysOfWeek.length === 0)) {
    const step = (r.frequency === "DAILY" ? 1 : 7) * interval * DAY;
    const k = Math.floor((after.getTime() - start.getTime()) / step) + 1;
    next = new Date(start.getTime() + k * step);
  } else if (r.frequency === "WEEKLY") {
    const days = new Set(r.daysOfWeek);
    const startWeek = weekStart(start);
    for (let i = 1; i <= 7 * interval + 7; i++) {
      const candidate = new Date(after.getTime() + i * DAY);
      candidate.setUTCHours(start.getUTCHours(), start.getUTCMinutes(), 0, 0);
      if (candidate <= after) continue;
      const weeks = Math.round((weekStart(candidate) - startWeek) / (7 * DAY));
      if (days.has(candidate.getUTCDay()) && weeks % interval === 0) {
        next = candidate;
        break;
      }
    }
  } else {
    const step = (r.frequency === "YEARLY" ? 12 : 1) * interval;
    const monthsSince =
      (after.getUTCFullYear() - start.getUTCFullYear()) * 12 + (after.getUTCMonth() - start.getUTCMonth());
    let k = Math.max(0, Math.floor(monthsSince / step) - 1);
    next = addMonthsClamped(start, k * step);
    while (next <= after) next = addMonthsClamped(start, ++k * step);
  }

  if (next && r.endDate && next > r.endDate) return null;
  return next;
}

/** Occurrences within [from, to), capped (used for calendar forecasts). */
export function occurrencesBetween(r: Recurrence, from: Date, to: Date, max = 60): Date[] {
  const out: Date[] = [];
  let cursor = nextOccurrence(r, new Date(from.getTime() - 1));
  while (cursor && cursor < to && out.length < max) {
    out.push(cursor);
    cursor = nextOccurrence(r, cursor);
  }
  return out;
}
