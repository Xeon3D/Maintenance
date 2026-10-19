import type { Role } from "@/generated/prisma/enums";

// On-call rota (pure): weeks run Monday to Sunday in the company's time zone and are keyed by
// their Monday as "yyyy-mm-dd" (stored in OnCallWeek.weekStart, a DATE column).

/** Roles that can join the on-call team: staff who handle work, not clients or read-only viewers. */
export const ON_CALL_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "ACCOUNTANT"];
export const canBeOnCall = (role: Role) => ON_CALL_ROLES.includes(role);

const DAY = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const msOf = (day: string) => Date.parse(`${day}T00:00:00Z`);

export const isDay = (v: string) => DAY_RE.test(v) && toDay(msOf(v)) === v;
export const isMonth = (v: string) => MONTH_RE.test(v);

/** The calendar day of instant `d` in `timeZone`. */
export function localDay(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const addDays = (day: string, n: number) => toDay(msOf(day) + n * DAY);

/** The Monday of the week holding `day`. */
export function mondayOf(day: string): string {
  const ms = msOf(day);
  return toDay(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY);
}

/** Key of the on-call week running at instant `d` in the company's zone. */
export const weekOf = (d: Date, timeZone: string) => mondayOf(localDay(d, timeZone));

/** A week key as the value Prisma stores in a DATE column. */
export const weekDate = (day: string) => new Date(msOf(day));
/** A DATE column back to its key. */
export const weekKey = (d: Date) => toDay(d.getTime());

/** Mondays of every week that has at least one day in `month` ("yyyy-mm"), in order. */
export function monthWeeks(month: string): string[] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const last = toDay(Date.UTC(y, m, 0));
  const out: string[] = [];
  for (let w = mondayOf(first); w <= last; w = addDays(w, 7)) out.push(w);
  return out;
}

/** "yyyy-mm" moved by `n` months. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** ISO-8601 week number of the week starting on Monday `week`. */
export function isoWeek(week: string): number {
  const thursday = msOf(addDays(week, 3)); // the ISO year is the one holding the week's Thursday
  const jan1 = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - jan1) / DAY / 7) + 1;
}
