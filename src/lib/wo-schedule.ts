// When a work order happens, for calendars (the app's month view, the field app, the .ics feed). Pure.
// A job is scheduled at its start date when it has one, else at its due date; with both it runs from the
// start day to the due day. Dates carry a time (the form defaults it to 09:00).

const DAY = 86_400_000;
/** Longest stretch drawn on the month view: a forgotten due date shouldn't paint a whole year. */
export const MAX_SPAN_DAYS = 31;

/** yyyy-mm-dd of `d` in `timeZone`. */
export function dayKey(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

type Dated = { startDate: Date | string | null; dueDate: Date | string | null };
const asDate = (v: Date | string | null) => (v == null ? null : v instanceof Date ? v : new Date(v));

/** When the job is scheduled: its start, else its due date; null when it has neither. */
export function scheduledAt(wo: Dated): Date | null {
  return asDate(wo.startDate) ?? asDate(wo.dueDate);
}

/** The days (yyyy-mm-dd in `timeZone`) the job occupies: start day … due day, at most MAX_SPAN_DAYS. */
export function scheduleDays(wo: Dated, timeZone: string): string[] {
  const start = scheduledAt(wo);
  if (!start) return [];
  const due = asDate(wo.dueDate);
  const end = due && due > start ? due : start;
  const last = dayKey(end, timeZone);
  const days: string[] = [];
  // Step by whole days from the start instant; keys are taken in the company's zone, so DST shifts don't skip days.
  for (let t = start.getTime(), i = 0; i < MAX_SPAN_DAYS; i++, t += DAY) {
    const k = dayKey(new Date(t), timeZone);
    if (days[days.length - 1] !== k) days.push(k);
    if (k >= last) break;
  }
  if (days[days.length - 1] < last && days.length < MAX_SPAN_DAYS) days.push(last);
  return days;
}

/**
 * "Upcoming" buckets for a technician's list: due now (overdue / today / undated), the next 30 days, later.
 * A job already in progress is current work whatever its dates say.
 */
export type Bucket = "now" | "next30" | "later";
export function bucketOf(wo: Dated & { status?: string }, now: Date, timeZone: string): Bucket {
  if (wo.status === "IN_PROGRESS") return "now";
  const at = scheduledAt(wo);
  if (!at) return "now";
  const today = dayKey(now, timeZone);
  const day = dayKey(at, timeZone);
  if (day <= today) return "now";
  return day <= dayKey(new Date(now.getTime() + 30 * DAY), timeZone) ? "next30" : "later";
}
