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

// ── On-call hours: when whoever is on call receives new client requests (Settings → Organization).

/** One period a day: from `start` to `end` ("HH:MM"); an end at or before the start runs into the next day (equal = 24 h). */
export type OnCallDay = { start: string; end: string } | null;
/** days[0] = Sunday. `holidays`: the company's holidays (business hours) are on call all day. */
export type OnCallHours = { days: OnCallDay[]; holidays: boolean };

/** Shown when the company first restricts the hours: weekday evenings until 02:00, and the whole weekend. */
export const DEFAULT_ON_CALL_HOURS: OnCallHours = {
  days: [
    { start: "02:00", end: "02:00" }, // Sunday 02:00 → Monday 02:00
    ...Array.from({ length: 5 }, () => ({ start: "18:00", end: "02:00" })),
    { start: "02:00", end: "02:00" }, // Saturday 02:00 → Sunday 02:00 (Friday's period covers until 02:00)
  ],
  holidays: true,
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
/** Length of a day's period in minutes (an end at or before the start is the next day's). */
const lengthOf = (d: { start: string; end: string }) => {
  const len = minutesOf(d.end) - minutesOf(d.start);
  return len > 0 ? len : len + 1440;
};

/** Stored JSON → on-call hours, or null (= at any time) when absent or malformed. */
export function parseOnCallHours(raw: unknown): OnCallHours | null {
  const o = raw && typeof raw === "object" ? (raw as { days?: unknown; holidays?: unknown }) : null;
  if (!o || !Array.isArray(o.days) || o.days.length !== 7) return null;
  const days = o.days.map((d): OnCallDay => {
    const { start, end } = (d && typeof d === "object" ? d : {}) as { start?: unknown; end?: unknown };
    return typeof start === "string" && typeof end === "string" && TIME.test(start) && TIME.test(end) ? { start, end } : null;
  });
  return { days, holidays: o.holidays === true };
}

/**
 * Reads the Settings → Organization fields: onCallMode ("always" | "hours"), onCallOn<d>, onCallStart<d>, onCallEnd<d>
 * (d = 0–6, Sunday first) and onCallHolidays. Null = at any time.
 */
export function onCallHoursFromForm(get: (name: string) => string | null): { hours: OnCallHours | null } | { errors: Record<string, string> } {
  if (get("onCallMode") !== "hours") return { hours: null };
  const errors: Record<string, string> = {};
  const days = Array.from({ length: 7 }, (_, d): OnCallDay => {
    if (get(`onCallOn${d}`) !== "on") return null;
    const start = get(`onCallStart${d}`) ?? "";
    const end = get(`onCallEnd${d}`) ?? "";
    if (!TIME.test(start) || !TIME.test(end)) {
      errors[`onCallEnd${d}`] = "invalid_format";
      return null;
    }
    return { start, end };
  });
  return Object.keys(errors).length ? { errors } : { hours: { days, holidays: get("onCallHolidays") === "on" } };
}

/**
 * The day (company time zone) whose on-call period holds instant `at`, or null when `at` is outside the on-call hours.
 * A period that runs past midnight belongs to the day it started on, so Monday 01:00 is still Sunday's (and the week
 * before's on-call person). `hours` null = at any time. `holidayDates` are the company's holidays ("yyyy-mm-dd").
 */
export function onCallShiftDay(at: Date, timeZone: string, hours: OnCallHours | null, holidayDates: string[] = []): string | null {
  const today = localDay(at, timeZone);
  if (!hours) return today;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(at);
  const now = Number(parts.find((p) => p.type === "hour")!.value) * 60 + Number(parts.find((p) => p.type === "minute")!.value);
  // Yesterday's period first: someone already on duty since last night keeps the request.
  for (const [day, minute] of [[addDays(today, -1), now + 1440], [today, now]] as const) {
    const periods: { from: number; to: number }[] = [];
    const d = hours.days[new Date(msOf(day)).getUTCDay()];
    if (d) periods.push({ from: minutesOf(d.start), to: minutesOf(d.start) + lengthOf(d) });
    if (hours.holidays && holidayDates.includes(day)) periods.push({ from: 0, to: 1440 });
    if (periods.some((p) => minute >= p.from && minute < p.to)) return day;
  }
  return null;
}

/** "18:00–02:00" runs into the next day: the form says so. */
export const endsNextDay = (d: { start: string; end: string }) => minutesOf(d.end) <= minutesOf(d.start);

/**
 * Who of the week's on-call people (`onCall`, user ids) gets a request: those in a team for the request's system
 * (`teamMembers`: members of the teams whose specialty is that system; null when the request has no system),
 * or everyone on call when none of them is in such a team.
 */
export function pickOnCall(onCall: string[], teamMembers: string[] | null): string[] {
  const inTeam = teamMembers ? onCall.filter((id) => teamMembers.includes(id)) : [];
  return inTeam.length ? inTeam : onCall;
}
