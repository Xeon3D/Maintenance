import { describe, expect, it } from "vitest";
import { formatDate, parseDate, parseTime } from "@/lib/date-input";

describe("typed dates (DD/MM/YYYY)", () => {
  it("reads day first", () => {
    expect(parseDate("14/10/2026")).toBe("2026-10-14");
    expect(parseDate("1/2/2026")).toBe("2026-02-01");
    expect(parseDate("01-02-2026")).toBe("2026-02-01");
    expect(parseDate("01.02.26")).toBe("2026-02-01");
    expect(parseDate("14102026")).toBe("2026-10-14");
    expect(parseDate(" 2026-10-14 ")).toBe("2026-10-14"); // pasted ISO
  });

  it("rejects impossible dates and US order", () => {
    expect(parseDate("10/14/2026")).toBeNull(); // month 14
    expect(parseDate("30/02/2026")).toBeNull();
    expect(parseDate("29/02/2028")).toBe("2028-02-29");
    expect(parseDate("29/02/2026")).toBeNull();
    expect(parseDate("abc")).toBeNull();
    expect(parseDate("")).toBe("");
  });

  it("formats ISO back to DD/MM/YYYY", () => {
    expect(formatDate("2026-10-14")).toBe("14/10/2026");
    expect(formatDate("2026-10-14T09:00:00.000Z")).toBe("14/10/2026");
    expect(formatDate(null)).toBe("");
  });
});

describe("typed times (24-hour)", () => {
  it("normalises to HH:MM", () => {
    expect(parseTime("14:00")).toBe("14:00");
    expect(parseTime("9:05")).toBe("09:05");
    expect(parseTime("9:5")).toBe("09:05");
    expect(parseTime("1430")).toBe("14:30");
    expect(parseTime("14.30")).toBe("14:30");
    expect(parseTime("14h30")).toBe("14:30");
    expect(parseTime("9")).toBe("09:00");
    expect(parseTime("")).toBe("");
  });

  it("rejects out-of-range and 12-hour input", () => {
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("2:00 PM")).toBeNull();
  });
});
