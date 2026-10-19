import { describe, expect, it } from "vitest";
import { addDays, canBeOnCall, DEFAULT_ON_CALL_HOURS, isDay, isMonth, isoWeek, localDay, mondayOf, monthWeeks, onCallHoursFromForm, onCallShiftDay, parseOnCallHours, shiftMonth, weekDate, weekKey, weekOf } from "../src/lib/on-call";

describe("on-call weeks", () => {
  it("finds the Monday of any day", () => {
    expect(mondayOf("2026-10-19")).toBe("2026-10-19"); // a Monday
    expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // Sunday belongs to the week before
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });

  it("uses the company's time zone for the current week", () => {
    // Sunday 23:30 in Lisbon (UTC+1 in summer) is still Sunday there, Monday nowhere yet.
    expect(weekOf(new Date("2026-10-18T22:30:00Z"), "Europe/Lisbon")).toBe("2026-10-12");
    // Monday 00:30 in Lisbon is already the new week, though it is still Sunday in UTC.
    expect(weekOf(new Date("2026-10-18T23:30:00Z"), "Europe/Lisbon")).toBe("2026-10-19");
    expect(weekOf(new Date("2026-10-19T03:00:00Z"), "America/New_York")).toBe("2026-10-12");
    expect(localDay(new Date("2026-03-29T23:30:00Z"), "Europe/Lisbon")).toBe("2026-03-30");
  });

  it("lists every week that touches a month", () => {
    expect(monthWeeks("2026-10")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(monthWeeks("2026-02")).toEqual(["2026-01-26", "2026-02-02", "2026-02-09", "2026-02-16", "2026-02-23"]);
    expect(monthWeeks("2027-02")).toEqual(["2027-02-01", "2027-02-08", "2027-02-15", "2027-02-22"]); // starts on a Monday, 28 days
  });

  it("moves between months and days", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(addDays("2026-10-26", 6)).toBe("2026-11-01");
  });

  it("round-trips a week through the DATE column", () => {
    expect(weekKey(weekDate("2026-10-19"))).toBe("2026-10-19");
  });

  it("numbers weeks the ISO way", () => {
    expect(isoWeek("2026-10-19")).toBe(43);
    expect(isoWeek("2025-12-29")).toBe(1); // holds 1 Jan 2026 (a Thursday)
    expect(isoWeek("2026-12-28")).toBe(53);
  });

  it("validates input", () => {
    expect(isDay("2026-10-19")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("19-10-2026")).toBe(false);
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
  });

  it("keeps clients and viewers out of the team", () => {
    expect(canBeOnCall("TECHNICIAN")).toBe(true);
    expect(canBeOnCall("OWNER")).toBe(true);
    expect(canBeOnCall("REQUESTER")).toBe(false);
    expect(canBeOnCall("VIEWER")).toBe(false);
  });
});

describe("on-call hours", () => {
  const tz = "Europe/Lisbon"; // UTC+1 until 25 Oct 2026, then UTC+0
  const at = (iso: string) => new Date(iso);
  const h = DEFAULT_ON_CALL_HOURS; // Mon–Fri 18:00–02:00, weekend 02:00–02:00

  it("is always on without hours", () => {
    expect(onCallShiftDay(at("2026-10-19T09:00:00Z"), tz, null)).toBe("2026-10-19");
  });

  it("is off during the working day", () => {
    expect(onCallShiftDay(at("2026-10-19T09:00:00Z"), tz, h)).toBeNull(); // Mon 10:00
    expect(onCallShiftDay(at("2026-10-20T01:30:00Z"), tz, h)).toBeNull(); // Tue 02:30
  });

  it("covers weekday evenings until 02:00, as the evening's shift", () => {
    expect(onCallShiftDay(at("2026-10-19T18:00:00Z"), tz, h)).toBe("2026-10-19"); // Mon 19:00
    expect(onCallShiftDay(at("2026-10-20T00:30:00Z"), tz, h)).toBe("2026-10-19"); // Tue 01:30 → Monday's
  });

  it("covers the whole weekend, and Sunday night belongs to the week before", () => {
    expect(onCallShiftDay(at("2026-10-24T00:00:00Z"), tz, h)).toBe("2026-10-23"); // Sat 01:00 → Friday's
    expect(onCallShiftDay(at("2026-10-24T13:00:00Z"), tz, h)).toBe("2026-10-24"); // Sat 14:00
    const mondayNight = onCallShiftDay(at("2026-10-26T01:00:00Z"), tz, h); // Mon 01:00 (after the clocks went back)
    expect(mondayNight).toBe("2026-10-25");
    expect(mondayOf(mondayNight!)).toBe("2026-10-19");
    expect(onCallShiftDay(at("2026-10-26T03:00:00Z"), tz, h)).toBeNull(); // Mon 03:00
  });

  it("can cover the company's holidays all day", () => {
    const wed = at("2026-10-21T09:00:00Z"); // Wed 10:00
    expect(onCallShiftDay(wed, tz, h, ["2026-10-21"])).toBe("2026-10-21");
    expect(onCallShiftDay(wed, tz, { ...h, holidays: false }, ["2026-10-21"])).toBeNull();
  });

  it("reads and validates the form", () => {
    const form = (v: Record<string, string>) => (k: string) => v[k] ?? null;
    expect(onCallHoursFromForm(form({ onCallMode: "always", onCallOn1: "on" }))).toEqual({ hours: null });
    const ok = onCallHoursFromForm(form({ onCallMode: "hours", onCallOn1: "on", onCallStart1: "18:00", onCallEnd1: "02:00", onCallHolidays: "on" }));
    expect(ok).toEqual({ hours: { days: [null, { start: "18:00", end: "02:00" }, null, null, null, null, null], holidays: true } });
    expect(onCallHoursFromForm(form({ onCallMode: "hours", onCallOn2: "on", onCallStart2: "25:00", onCallEnd2: "02:00" }))).toEqual({ errors: { onCallEnd2: "invalid_format" } });
    expect(parseOnCallHours(null)).toBeNull();
    expect(parseOnCallHours({ days: [1, 2] })).toBeNull();
  });
});
