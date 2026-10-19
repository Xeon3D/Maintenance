import { describe, expect, it } from "vitest";
import { addDays, canBeOnCall, isDay, isMonth, isoWeek, localDay, mondayOf, monthWeeks, shiftMonth, weekDate, weekKey, weekOf } from "../src/lib/on-call";

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
