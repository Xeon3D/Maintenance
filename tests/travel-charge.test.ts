import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import { countTrips, isFar, travelCharge, travelOf, travelRuleFor, tripCost } from "@/lib/travel-charge";
import { workOrderCosts } from "@/lib/work-orders";

const org = { travelFee: "30.00", travelRadiusKm: 25, travelKmRate: "0.40", travelPerTechnician: true, timezone: "Europe/Lisbon" };
const rule = travelRuleFor(org);
const entry = (userId: string, startedAt: string, mode: "ONSITE" | "REMOTE" = "ONSITE", minutes: number | null = 60) => ({
  userId,
  startedAt: new Date(startedAt),
  mode,
  minutes,
  hourlyRate: 40,
});

describe("trip charges", () => {
  it("reads the company's rule", () => {
    expect(rule).toEqual({ fee: 30, radiusKm: 25, kmRate: 0.4, perTechnician: true, included: false });
  });

  it("charges the fixed fee within the radius (or without a distance), the rate × the whole one-way distance beyond it", () => {
    expect(tripCost(null, rule)).toBe(30);
    expect(tripCost(10, rule)).toBe(30);
    expect(tripCost(25, rule)).toBe(30); // the radius itself is still within
    expect(isFar(25, rule)).toBe(false);
    expect(tripCost(40, rule)).toBe(16); // 40 × 0.40: the whole distance, not just the 15 km past the radius
    expect(isFar(40, rule)).toBe(true);
  });

  it("counts one trip per technician per day with finished on-site time", () => {
    const entries = [
      entry("rui", "2026-10-19T09:00:00Z"),
      entry("rui", "2026-10-19T14:00:00Z"), // same day, same person: same trip
      entry("daniel", "2026-10-19T09:00:00Z", "REMOTE"), // remote: no trip
      entry("miguel", "2026-10-19T09:30:00Z"), // a second technician on site: a second trip
      entry("rui", "2026-10-20T09:00:00Z"), // next day: another trip
      entry("rui", "2026-10-21T09:00:00Z", "ONSITE", null), // running timer: not yet
    ];
    expect(countTrips(entries, "Europe/Lisbon")).toBe(3);
    // Per work order: the 19th and the 20th, however many went.
    expect(countTrips(entries, "Europe/Lisbon", false)).toBe(2);
  });

  it("splits days in the company's time zone", () => {
    // 23:30 UTC on the 19th is 00:30 on the 20th in Lisbon (summer time).
    const entries = [entry("rui", "2026-10-19T10:00:00Z"), entry("rui", "2026-10-19T23:30:00Z")];
    expect(countTrips(entries, "Europe/Lisbon")).toBe(2);
    expect(countTrips(entries, "UTC")).toBe(1);
  });

  it("uses the contract's own amounts where it sets them, and none when it includes trips", () => {
    expect(travelRuleFor(org, { travelIncluded: false, travelFee: null, travelKmRate: null })).toMatchObject({ fee: 30, kmRate: 0.4 });
    expect(travelRuleFor(org, { travelIncluded: false, travelFee: "20", travelKmRate: null })).toMatchObject({ fee: 20, kmRate: 0.4 });
    expect(travelRuleFor(org, { travelIncluded: false, travelFee: null, travelKmRate: "0" })).toMatchObject({ fee: 30, kmRate: 0 });
    expect(travelRuleFor(org, { travelIncluded: true, travelFee: "20", travelKmRate: "1" })).toMatchObject({ fee: 0, kmRate: 0, included: true });
    expect(travelRuleFor({ ...org, travelPerTechnician: false }).perTechnician).toBe(false);
  });

  it("totals trips × cost per trip, and nothing when trips aren't charged", () => {
    const entries = [entry("rui", "2026-10-19T09:00:00Z"), entry("miguel", "2026-10-19T09:00:00Z")];
    expect(travelCharge(entries, 40, travelOf(org))).toEqual({ trips: 2, perTrip: 16, amount: 32, far: true });
    expect(travelCharge(entries, 40, travelOf({ ...org, travelPerTechnician: false }))).toMatchObject({ trips: 1, amount: 16 });
    expect(travelCharge(entries, 40, travelOf(org, { travelIncluded: true, travelFee: null, travelKmRate: null }))).toMatchObject({ trips: 0, amount: 0 });
    expect(travelCharge(entries, null, null).amount).toBe(0);
  });

  it("adds trips to the work order's total", () => {
    const wo = {
      priority: "MEDIUM",
      timeEntries: [entry("rui", "2026-10-19T09:00:00Z"), entry("daniel", "2026-10-19T09:00:00Z", "REMOTE")],
      otherCosts: [],
      villa: { distanceKm: 10 },
    };
    const c = workOrderCosts(wo, 0, undefined, travelOf(org));
    expect(c.trips).toBe(1);
    expect(c.travel).toBe(30);
    expect(c.total).toBe(80 + 30); // 2 h × 40 + one trip
    expect(workOrderCosts(wo, 0).travel).toBe(0); // no trip rule passed
  });
});
