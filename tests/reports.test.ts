import { describe, expect, it } from "vitest";
import { compliance, contractYear, covers, pickContract, slaStates, type ContractLike } from "@/lib/sla";
import { buckets, countByBucket, grainFor, median, pmCompliance, sumBy, timeInStatus, workingDays } from "@/lib/report-math";
import { toCsv } from "@/lib/csv";

const d = (s: string) => new Date(s);
const H = 3_600_000;

describe("SLA", () => {
  const terms = { responseTimeHours: 4, resolutionTimeHours: 24 };
  const wo = { createdAt: d("2026-09-01T08:00:00Z"), status: "OPEN" as const, firstResponseAt: null, completedAt: null };

  it("is pending until the target passes, then breached", () => {
    expect(slaStates(wo, terms, d("2026-09-01T11:00:00Z")).response).toBe("pending");
    expect(slaStates(wo, terms, d("2026-09-01T13:00:00Z")).response).toBe("breached");
  });

  it("judges by when it happened, not by now", () => {
    const done = { ...wo, status: "DONE" as const, firstResponseAt: d("2026-09-01T09:00:00Z"), completedAt: d("2026-09-03T08:00:00Z") };
    const s = slaStates(done, terms, d("2027-01-01Z"));
    expect(s.response).toBe("met");
    expect(s.resolution).toBe("breached");
  });

  it("counts finishing as responding and ignores cancelled work", () => {
    const quick = { ...wo, status: "DONE" as const, completedAt: d("2026-09-01T10:00:00Z") };
    expect(slaStates(quick, terms).response).toBe("met");
    expect(slaStates({ ...wo, status: "CANCELLED" as const }, terms).resolution).toBe("na");
    expect(slaStates(wo, null).response).toBe("na");
  });

  it("computes compliance over decided cases only", () => {
    expect(compliance(["met", "met", "breached", "pending", "na"])).toEqual({ met: 2, breached: 1, pending: 1, pct: 2 / 3 });
    expect(compliance(["pending"]).pct).toBeNull();
  });
});

describe("contract matching", () => {
  const base: ContractLike = { id: "c", clientId: "cl", villaId: null, status: "ACTIVE", startDate: d("2026-01-01Z"), endDate: d("2026-12-31Z"), systems: [] };
  const job = { villaId: "v1", clientIds: ["cl"], system: "NETWORK" as const, at: d("2026-06-01Z") };

  it("respects client, villa, dates (end day inclusive) and systems", () => {
    expect(covers(base, job)).toBe(true);
    expect(covers({ ...base, clientId: "x" }, job)).toBe(false);
    expect(covers({ ...base, villaId: "v2" }, job)).toBe(false);
    expect(covers(base, { ...job, at: d("2026-12-31T18:00:00Z") })).toBe(true);
    expect(covers(base, { ...job, at: d("2027-01-01T01:00:00Z") })).toBe(false);
    expect(covers({ ...base, systems: ["CCTV"] }, job)).toBe(false);
    expect(covers({ ...base, status: "DRAFT" }, job)).toBe(false);
  });

  it("covers a villa through its owner or its property manager", () => {
    const managed = { ...job, clientIds: ["owner", "pm"] };
    expect(covers({ ...base, clientId: "pm" }, managed)).toBe(true);
    expect(covers({ ...base, clientId: "owner" }, managed)).toBe(true);
    expect(covers({ ...base, clientId: "other-owner" }, managed)).toBe(false);
  });

  it("prefers a villa-specific contract", () => {
    const villa = { ...base, id: "villa", villaId: "v1", startDate: d("2025-01-01Z"), endDate: null };
    expect(pickContract([base, villa], job)?.id).toBe("villa");
  });

  it("finds the current contract year", () => {
    expect(contractYear(d("2024-03-15Z"), d("2026-09-28Z")).from.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });
});

describe("report maths", () => {
  it("picks a grain for the range and buckets on Mondays", () => {
    expect(grainFor(d("2026-09-01Z"), d("2026-09-28Z"))).toBe("day");
    expect(grainFor(d("2026-07-01Z"), d("2026-09-28Z"))).toBe("week");
    expect(grainFor(d("2025-09-28Z"), d("2026-09-28Z"))).toBe("month");
    expect(buckets(d("2026-09-02Z"), d("2026-09-10Z"), "week").map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-08-31", "2026-09-07"]);
  });

  it("counts dates per bucket and skips ones outside the range", () => {
    const r = countByBucket({ created: [d("2026-09-01T10:00Z"), d("2026-09-01T12:00Z"), d("2026-08-01Z")], done: [null, d("2026-09-02Z")] }, d("2026-09-01Z"), d("2026-09-03T23:00Z"));
    expect(r.counts).toEqual({ created: [2, 0, 0], done: [0, 1, 0] });
  });

  it("medians, sums and working days", () => {
    expect(median([5, 1, 3, 2])).toBe(2.5);
    expect(sumBy([{ k: "a", v: 1 }, { k: "b", v: 5 }, { k: "a", v: 2 }], (x) => x.k, (x) => x.v)).toEqual([["b", 5], ["a", 3]]);
    expect(workingDays(d("2026-09-26Z"), d("2026-10-02Z"))).toBe(5); // Sat → Fri
  });

  it("measures downtime from the status log, clipped to the window", () => {
    const logs = [
      { status: "DOWN" as const, createdAt: d("2026-08-31T20:00:00Z") }, // before the window: sets the initial state
      { status: "OPERATIONAL" as const, createdAt: d("2026-09-01T06:00:00Z") },
      { status: "DOWN" as const, createdAt: d("2026-09-01T10:00:00Z") },
    ];
    expect(timeInStatus(logs, "OPERATIONAL", d("2026-09-01T00:00:00Z"), d("2026-09-01T12:00:00Z")) / H).toBe(8);
  });

  it("scores preventive compliance", () => {
    const due = d("2026-09-10Z");
    expect(
      pmCompliance([
        { status: "DONE", dueDate: due, completedAt: d("2026-09-09Z") },
        { status: "DONE", dueDate: due, completedAt: d("2026-09-12Z") },
        { status: "OPEN", dueDate: due, completedAt: null },
        { status: "CANCELLED", dueDate: due, completedAt: null },
      ]),
    ).toEqual({ due: 3, onTime: 1, late: 1, missed: 1, pct: 1 / 3 });
  });
});

describe("CSV", () => {
  it("quotes, neutralises formulas and adds a BOM", () => {
    const csv = toCsv(["a", "b"], [["=SUM(A1)", 'say "hi", ok'], [null, -2]]);
    expect(csv).toBe('﻿a,b\r\n\'=SUM(A1),"say ""hi"", ok"\r\n,-2\r\n');
  });
});
