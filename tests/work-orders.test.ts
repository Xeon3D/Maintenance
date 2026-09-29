import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import { isItemComplete, isSignedOff, workOrderCosts } from "@/lib/work-orders";

describe("isItemComplete", () => {
  it("treats headings as complete and unchecked boxes as incomplete", () => {
    expect(isItemComplete({ type: "HEADING", value: null })).toBe(true);
    expect(isItemComplete({ type: "CHECKBOX", value: "false" })).toBe(false);
    expect(isItemComplete({ type: "CHECKBOX", value: "true" })).toBe(true);
  });

  it("requires a non-blank value for other types", () => {
    expect(isItemComplete({ type: "TEXT", value: "  " })).toBe(false);
    expect(isItemComplete({ type: "PASS_FAIL", value: "FAIL" })).toBe(true);
    expect(isItemComplete({ type: "NUMBER", value: "0" })).toBe(true);
  });
});

describe("workOrderCosts", () => {
  it("sums labour at each entry's snapshotted rate plus other costs", () => {
    const c = workOrderCosts({
      timeEntries: [
        { minutes: 90, hourlyRate: "40" },
        { minutes: 30, hourlyRate: 60 },
        { minutes: null, hourlyRate: 50 }, // running timer: not counted
      ],
      otherCosts: [{ amount: "25.50" }],
    });
    expect(c.minutes).toBe(120);
    expect(c.labor).toBe(90);
    expect(c.total).toBeCloseTo(115.5);
  });
});

describe("isSignedOff (required to complete a job)", () => {
  it("needs the client's signature or client absent", () => {
    expect(isSignedOff({ signatureUrl: null, clientAbsent: false })).toBe(false);
    expect(isSignedOff({ signatureUrl: "att1", clientAbsent: false })).toBe(true);
    expect(isSignedOff({ signatureUrl: null, clientAbsent: true })).toBe(true);
  });
});
