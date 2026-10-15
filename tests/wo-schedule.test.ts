import { describe, expect, it } from "vitest";
import { bucketOf, dayKey, MAX_SPAN_DAYS, scheduleDays, scheduledAt } from "@/lib/wo-schedule";

const tz = "Europe/Lisbon";

describe("work order schedule", () => {
  it("is scheduled at the start date, else at the due date", () => {
    expect(scheduledAt({ startDate: "2026-10-20T08:00:00Z", dueDate: "2026-10-22T08:00:00Z" })?.toISOString()).toBe("2026-10-20T08:00:00.000Z");
    expect(scheduledAt({ startDate: null, dueDate: "2026-10-22T08:00:00Z" })?.toISOString()).toBe("2026-10-22T08:00:00.000Z");
    expect(scheduledAt({ startDate: null, dueDate: null })).toBeNull();
  });

  it("occupies every day from start to due, in the company's time zone", () => {
    expect(scheduleDays({ startDate: "2026-10-20T08:00:00Z", dueDate: "2026-10-22T17:00:00Z" }, tz)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(scheduleDays({ startDate: null, dueDate: "2026-10-22T08:00:00Z" }, tz)).toEqual(["2026-10-22"]);
    // 23:30 UTC on 24 Oct is already 25 Oct in Lisbon (summer time ends on the 25th).
    expect(scheduleDays({ startDate: "2026-10-24T23:30:00Z", dueDate: null }, tz)).toEqual(["2026-10-25"]);
    // Across the DST change: no day skipped or repeated.
    expect(scheduleDays({ startDate: "2026-10-24T09:00:00Z", dueDate: "2026-10-26T09:00:00Z" }, tz)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });

  it("caps long stretches and ignores a due date before the start", () => {
    expect(scheduleDays({ startDate: "2026-01-01T09:00:00Z", dueDate: "2026-12-31T09:00:00Z" }, tz)).toHaveLength(MAX_SPAN_DAYS);
    expect(scheduleDays({ startDate: "2026-10-20T09:00:00Z", dueDate: "2026-10-18T09:00:00Z" }, tz)).toEqual(["2026-10-20"]);
  });

  it("sorts a technician's jobs into now / next 30 days / later", () => {
    const now = new Date("2026-10-15T10:00:00Z");
    expect(bucketOf({ startDate: null, dueDate: null }, now, tz)).toBe("now");
    expect(bucketOf({ startDate: null, dueDate: "2026-10-10T09:00:00Z" }, now, tz)).toBe("now"); // overdue
    expect(bucketOf({ startDate: "2026-10-15T17:00:00Z", dueDate: null }, now, tz)).toBe("now"); // later today
    expect(bucketOf({ startDate: "2026-10-16T08:00:00Z", dueDate: null }, now, tz)).toBe("next30");
    expect(bucketOf({ startDate: null, dueDate: "2026-11-14T09:00:00Z" }, now, tz)).toBe("next30");
    expect(bucketOf({ startDate: null, dueDate: "2026-12-01T09:00:00Z" }, now, tz)).toBe("later");
    expect(bucketOf({ startDate: "2026-11-01T09:00:00Z", dueDate: null, status: "IN_PROGRESS" }, now, tz)).toBe("now"); // started early
    expect(dayKey(now, tz)).toBe("2026-10-15");
  });
});
