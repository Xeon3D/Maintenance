import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import { urgentApplies, urgentRuleFor, urgentSurcharge } from "@/lib/urgent-surcharge";
import { workOrderCosts } from "@/lib/work-orders";

const org = { urgentFee: "50.00", urgentPercent: 20 };

describe("urgent surcharge", () => {
  it("uses the contract's own surcharge when it sets one, else the company's", () => {
    expect(urgentRuleFor(org, null)).toEqual({ fee: 50, percent: 20 });
    expect(urgentRuleFor(org, { urgentFee: null, urgentPercent: null })).toEqual({ fee: 50, percent: 20 });
    expect(urgentRuleFor(org, { urgentFee: "0", urgentPercent: null })).toEqual({ fee: 0, percent: 0 }); // premium: none
    expect(urgentRuleFor(org, { urgentFee: null, urgentPercent: 10 })).toEqual({ fee: 0, percent: 10 });
  });

  it("charges fixed + percentage of labour, only on urgent work orders", () => {
    const rule = { fee: 50, percent: 20 };
    expect(urgentSurcharge("URGENT", 200, rule)).toBe(90);
    expect(urgentSurcharge("HIGH", 200, rule)).toBe(0);
    expect(urgentApplies("URGENT", { fee: 0, percent: 0 })).toBe(false);
  });

  it("adds the surcharge to the work order's total", () => {
    // 2 h at 40 €/h = 80 € labour; urgent: 50 € + 20% of 80 € = 66 €
    const c = workOrderCosts(
      { priority: "URGENT", timeEntries: [{ userId: "u", minutes: 120, hourlyRate: 40 }], otherCosts: [{ amount: 10 }] },
      30,
      { fee: 50, percent: 20 },
    );
    expect(c.labor).toBe(80);
    expect(c.urgent).toBe(66);
    expect(c.total).toBe(156);
    expect(workOrderCosts({ priority: "MEDIUM", timeEntries: [], otherCosts: [] }, 30, { fee: 50, percent: 20 }).urgent).toBe(0);
  });
});
