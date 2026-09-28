import { describe, expect, it } from "vitest";
import { nextOccurrence, occurrencesBetween, type Recurrence } from "@/lib/pm-schedule";

const d = (s: string) => new Date(s);
const iso = (x: Date | null) => x?.toISOString().slice(0, 16);

describe("nextOccurrence", () => {
  it("returns the start date when asked before it", () => {
    const r: Recurrence = { frequency: "MONTHLY", interval: 1, daysOfWeek: [], startDate: d("2026-10-05T08:00Z"), endDate: null };
    expect(iso(nextOccurrence(r, d("2026-09-01T00:00Z")))).toBe("2026-10-05T08:00");
  });

  it("steps daily and every N weeks, strictly after the given time", () => {
    const daily: Recurrence = { frequency: "DAILY", interval: 2, daysOfWeek: [], startDate: d("2026-01-01T09:00Z"), endDate: null };
    expect(iso(nextOccurrence(daily, d("2026-01-01T09:00Z")))).toBe("2026-01-03T09:00");
    const biweekly: Recurrence = { frequency: "WEEKLY", interval: 2, daysOfWeek: [], startDate: d("2026-01-05T09:00Z"), endDate: null };
    expect(iso(nextOccurrence(biweekly, d("2026-01-10T00:00Z")))).toBe("2026-01-19T09:00");
  });

  it("handles weekly schedules on specific weekdays", () => {
    // Mondays and Thursdays, starting Thursday 1 Jan 2026
    const r: Recurrence = { frequency: "WEEKLY", interval: 1, daysOfWeek: [1, 4], startDate: d("2026-01-01T07:30Z"), endDate: null };
    expect(occurrencesBetween(r, d("2026-01-01T00:00Z"), d("2026-01-13T00:00Z")).map(iso)).toEqual([
      "2026-01-01T07:30",
      "2026-01-05T07:30",
      "2026-01-08T07:30",
      "2026-01-12T07:30",
    ]);
  });

  it("clamps monthly schedules to the end of short months and keeps the anchor day", () => {
    const r: Recurrence = { frequency: "MONTHLY", interval: 1, daysOfWeek: [], startDate: d("2026-01-31T10:00Z"), endDate: null };
    expect(occurrencesBetween(r, d("2026-01-01T00:00Z"), d("2026-05-01T00:00Z")).map(iso)).toEqual([
      "2026-01-31T10:00",
      "2026-02-28T10:00",
      "2026-03-31T10:00",
      "2026-04-30T10:00",
    ]);
  });

  it("supports quarterly and yearly intervals", () => {
    const q: Recurrence = { frequency: "MONTHLY", interval: 3, daysOfWeek: [], startDate: d("2026-02-15T09:00Z"), endDate: null };
    expect(iso(nextOccurrence(q, d("2026-06-01T00:00Z")))).toBe("2026-08-15T09:00");
    const y: Recurrence = { frequency: "YEARLY", interval: 1, daysOfWeek: [], startDate: d("2024-02-29T09:00Z"), endDate: null };
    expect(iso(nextOccurrence(y, d("2024-03-01T00:00Z")))).toBe("2025-02-28T09:00");
  });

  it("keeps local wall-clock time across daylight-saving changes", () => {
    // 09:00 Lisbon in summer (08:00Z) should still be 09:00 Lisbon in winter (09:00Z).
    const r: Recurrence = { frequency: "MONTHLY", interval: 3, daysOfWeek: [], startDate: d("2026-09-29T08:00Z"), endDate: null, timeZone: "Europe/Lisbon" };
    expect(occurrencesBetween(r, d("2026-09-01T00:00Z"), d("2027-07-01T00:00Z")).map(iso)).toEqual([
      "2026-09-29T08:00",
      "2026-12-29T09:00",
      "2027-03-29T08:00",
      "2027-06-29T08:00",
    ]);
  });

  it("uses the zone's weekday, not UTC's", () => {
    // Monday 00:30 in Dubai is still Sunday in UTC.
    const r: Recurrence = { frequency: "WEEKLY", interval: 1, daysOfWeek: [1], startDate: d("2026-01-04T20:30Z"), endDate: null, timeZone: "Asia/Dubai" };
    expect(iso(nextOccurrence(r, d("2026-01-05T00:00Z")))).toBe("2026-01-11T20:30");
  });

  it("stops after the end date", () => {
    const r: Recurrence = { frequency: "MONTHLY", interval: 1, daysOfWeek: [], startDate: d("2026-01-10T09:00Z"), endDate: d("2026-03-01T00:00Z") };
    expect(nextOccurrence(r, d("2026-02-10T09:00Z"))).toBeNull();
  });
});
