import { describe, expect, it } from "vitest";
import { addSlaTime, businessHoursFromForm, DEFAULT_BUSINESS_HOURS, holdPeriods, parseBusinessHours, type Clock } from "@/lib/sla-clock";
import { compliance, slaStates } from "@/lib/sla";

const H = 3_600_000;
const d = (s: string) => new Date(s);
const iso = (x: Date | null) => x?.toISOString() ?? null;
const always: Clock = { timeZone: "UTC", hours: null, pauses: [] };
const lisbon = (extra: Partial<Clock> = {}): Clock => ({ timeZone: "Europe/Lisbon", hours: DEFAULT_BUSINESS_HOURS, pauses: [], ...extra });

describe("SLA clock — around the clock", () => {
  it("adds plain hours without pauses", () => {
    expect(iso(addSlaTime(d("2026-11-06T17:00:00Z"), 4 * H, always))).toBe("2026-11-06T21:00:00.000Z");
  });

  it("skips paused periods", () => {
    const pauses = [{ from: d("2026-11-06T01:00:00Z"), to: d("2026-11-06T03:00:00Z") }];
    expect(iso(addSlaTime(d("2026-11-06T00:00:00Z"), 4 * H, { ...always, pauses }))).toBe("2026-11-06T06:00:00.000Z");
  });

  it("has no due date while paused indefinitely before the target", () => {
    const pauses = [{ from: d("2026-11-06T02:00:00Z"), to: null }];
    expect(addSlaTime(d("2026-11-06T00:00:00Z"), 4 * H, { ...always, pauses })).toBeNull();
    // A pause that starts after the target doesn't matter.
    expect(iso(addSlaTime(d("2026-11-06T00:00:00Z"), 1 * H, { ...always, pauses }))).toBe("2026-11-06T01:00:00.000Z");
  });
});

describe("SLA clock — business hours (Mon–Fri 09:00–18:00, Lisbon)", () => {
  it("carries over the weekend", () => {
    // Friday 17:00 (winter, UTC+0) + 4 h = 1 h on Friday + 3 h on Monday → Monday 12:00.
    expect(iso(addSlaTime(d("2026-11-06T17:00:00Z"), 4 * H, lisbon()))).toBe("2026-11-09T12:00:00.000Z");
  });

  it("starts at opening time when opened outside hours", () => {
    expect(iso(addSlaTime(d("2026-11-07T10:00:00Z"), 2 * H, lisbon()))).toBe("2026-11-09T11:00:00.000Z"); // Saturday → Monday 11:00
    expect(iso(addSlaTime(d("2026-11-10T06:30:00Z"), 1 * H, lisbon()))).toBe("2026-11-10T10:00:00.000Z"); // before opening
  });

  it("follows local time across daylight saving (summer is UTC+1)", () => {
    // Friday 3 July 17:00 local = 16:00Z; due Monday 12:00 local = 11:00Z.
    expect(iso(addSlaTime(d("2026-07-03T16:00:00Z"), 4 * H, lisbon()))).toBe("2026-07-06T11:00:00.000Z");
  });

  it("skips holidays", () => {
    const hours = { ...DEFAULT_BUSINESS_HOURS, holidays: ["2026-11-09"] };
    expect(iso(addSlaTime(d("2026-11-06T17:00:00Z"), 4 * H, lisbon({ hours })))).toBe("2026-11-10T12:00:00.000Z");
  });

  it("combines business hours and pauses", () => {
    // Monday 09:00, 8 h target, on hold 10:00–14:00 → 1 h + 4 h (14–18) + 3 h Tuesday → Tuesday 12:00.
    const pauses = [{ from: d("2026-11-09T10:00:00Z"), to: d("2026-11-09T14:00:00Z") }];
    expect(iso(addSlaTime(d("2026-11-09T09:00:00Z"), 8 * H, lisbon({ pauses })))).toBe("2026-11-10T12:00:00.000Z");
  });

  it("gives up on a calendar with no open days", () => {
    expect(addSlaTime(d("2026-11-09T09:00:00Z"), H, lisbon({ hours: { days: Array(7).fill(null), holidays: [] } }))).toBeNull();
  });
});

describe("on-hold periods", () => {
  it("pairs entering and leaving ON_HOLD, open-ended when still on hold", () => {
    const logs = [
      { toStatus: "OPEN", createdAt: d("2026-11-09T09:00:00Z") },
      { toStatus: "ON_HOLD", createdAt: d("2026-11-09T10:00:00Z") },
      { toStatus: "IN_PROGRESS", createdAt: d("2026-11-09T12:00:00Z") },
      { toStatus: "ON_HOLD", createdAt: d("2026-11-09T15:00:00Z") },
    ];
    expect(holdPeriods(logs)).toEqual([
      { from: d("2026-11-09T10:00:00Z"), to: d("2026-11-09T12:00:00Z") },
      { from: d("2026-11-09T15:00:00Z"), to: null },
    ]);
  });
});

describe("SLA states with the clock", () => {
  const calendar = { timeZone: "Europe/Lisbon", hours: DEFAULT_BUSINESS_HOURS };
  const terms = { responseTimeHours: 4, resolutionTimeHours: 8, businessHoursOnly: true, pauseOnHold: true };

  it("is paused, not breached, while on hold", () => {
    const wo = {
      createdAt: d("2026-11-09T09:00:00Z"),
      status: "ON_HOLD" as const,
      firstResponseAt: d("2026-11-09T09:30:00Z"),
      completedAt: null,
      statusLogs: [{ toStatus: "ON_HOLD" as const, createdAt: d("2026-11-09T10:00:00Z") }],
    };
    const s = slaStates(wo, terms, d("2026-11-20T09:00:00Z"), calendar);
    expect(s.response).toBe("met");
    expect(s.resolution).toBe("paused");
    expect(s.resolutionDue).toBeNull();
    expect(compliance([s.resolution]).pending).toBe(1);
  });

  it("without the options behaves as before (calendar hours)", () => {
    const wo = { createdAt: d("2026-11-06T17:00:00Z"), status: "OPEN" as const, firstResponseAt: null, completedAt: null };
    const s = slaStates(wo, { responseTimeHours: 4, resolutionTimeHours: null }, d("2026-11-06T22:00:00Z"), calendar);
    expect(iso(s.responseDue)).toBe("2026-11-06T21:00:00.000Z");
    expect(s.response).toBe("breached");
    expect(s.resolution).toBe("na");
  });

  it("business hours keep a Friday-evening job within target until Monday", () => {
    const wo = { createdAt: d("2026-11-06T17:00:00Z"), status: "OPEN" as const, firstResponseAt: null, completedAt: null };
    const s = slaStates(wo, { ...terms, pauseOnHold: false }, d("2026-11-09T11:00:00Z"), calendar);
    expect(s.response).toBe("pending");
  });
});

describe("business hours settings", () => {
  it("falls back to Mon–Fri 09:00–18:00 and drops invalid days", () => {
    expect(parseBusinessHours(null)).toEqual(DEFAULT_BUSINESS_HOURS);
    const days = [null, { start: "08:00", end: "12:00" }, { start: "18:00", end: "09:00" }, null, null, null, { start: "9:00", end: "13:00" }];
    expect(parseBusinessHours({ days, holidays: ["2026-12-25", "bad", "2026-12-25"] })).toEqual({
      days: [null, { start: "08:00", end: "12:00" }, null, null, null, null, null],
      holidays: ["2026-12-25"],
    });
  });

  it("reads the form and reports bad rows", () => {
    const form = (v: Record<string, string>) => (k: string) => v[k] ?? null;
    const ok = businessHoursFromForm(form({ open1: "on", start1: "08:30", end1: "17:30", holidays: "2026-12-25\n2026-01-01" }));
    expect(ok).toEqual({ hours: { days: [null, { start: "08:30", end: "17:30" }, null, null, null, null, null], holidays: ["2026-01-01", "2026-12-25"] } });
    expect(businessHoursFromForm(form({ open2: "on", start2: "18:00", end2: "09:00" }))).toEqual({ errors: { end2: "closesBeforeOpens" } });
    expect(businessHoursFromForm(form({ holidays: "2026-02-30" }))).toEqual({ errors: { holidays: "badHoliday" } });
  });
});
