import { describe, expect, it } from "vitest";
import { billedTime, roundUpMinutes, timeRoundingOf } from "@/lib/billing-time";

describe("billed time", () => {
  it("rounds up to whole blocks", () => {
    expect(roundUpMinutes(34, 30)).toBe(60);
    expect(roundUpMinutes(30, 30)).toBe(30);
    expect(roundUpMinutes(1, 30)).toBe(30);
    expect(roundUpMinutes(61, 60)).toBe(120);
    expect(roundUpMinutes(34, 0)).toBe(34); // no rounding
    expect(roundUpMinutes(0, 30)).toBe(0);
  });

  it("rounds each technician's total on the work order, not each entry", () => {
    const t = billedTime(
      [
        { userId: "rui", minutes: 20, hourlyRate: 40 },
        { userId: "rui", minutes: 14, hourlyRate: 40 }, // Rui: 34 min → 60
        { userId: "ana", minutes: 10, hourlyRate: 60 }, // Ana: 10 min → 30
        { userId: "ana", minutes: null, hourlyRate: 60 }, // running timer
      ],
      30,
    );
    expect(t.minutes).toBe(44);
    expect(t.billed).toBe(90);
    expect(t.people.find((p) => p.userId === "rui")).toMatchObject({ minutes: 34, billed: 60, labor: 40 });
    expect(t.people.find((p) => p.userId === "ana")).toMatchObject({ minutes: 10, billed: 30, labor: 30 });
    expect(t.labor).toBe(70);
  });

  it("keeps a person's rate mix when scaling to the billed time", () => {
    // 15 min at 40 €/h + 15 min at 80 €/h = 30 min, 30 € → billed 60 min: 60 €
    const t = billedTime([{ userId: "u", minutes: 15, hourlyRate: 40 }, { userId: "u", minutes: 15, hourlyRate: 80 }], 60);
    expect(t.billed).toBe(60);
    expect(t.labor).toBeCloseTo(60);
  });

  it("falls back to 30 minutes for unknown settings", () => {
    expect(timeRoundingOf(15)).toBe(15);
    expect(timeRoundingOf(0)).toBe(0);
    expect(timeRoundingOf(45)).toBe(30);
    expect(timeRoundingOf(null)).toBe(30);
  });
});
