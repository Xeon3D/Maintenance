import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import {
  isLowStock,
  onHand,
  partsCost,
  poActions,
  poTotals,
  remainingQty,
  reorderQuantity,
  statusAfterReceipt,
} from "@/lib/inventory-math";
import { workOrderCosts } from "@/lib/work-orders";

describe("stock levels", () => {
  it("sums decimal quantities without float drift", () => {
    expect(onHand([{ quantity: "0.1" }, { quantity: "0.2" }])).toBe(0.3);
  });

  it("flags a part at or below its org-wide reorder point", () => {
    expect(isLowStock({ minQuantity: 5, stock: [{ quantity: 3 }, { quantity: 2 }] })).toBe(true);
    expect(isLowStock({ minQuantity: 5, stock: [{ quantity: 3 }, { quantity: 3 }] })).toBe(false);
  });

  it("treats a minimum of 0 as untracked", () => {
    expect(isLowStock({ minQuantity: 0, stock: [] })).toBe(false);
  });

  it("flags a location below its own minimum even when the total is fine", () => {
    // Warehouse full, van kit short.
    const part = { minQuantity: 5, stock: [{ quantity: 40 }, { quantity: 1, minQuantity: 4 }] };
    expect(isLowStock(part)).toBe(true);
  });
});

describe("reorderQuantity", () => {
  it("tops up to twice the reorder point", () => {
    expect(reorderQuantity({ minQuantity: 5, stock: [{ quantity: 2 }] })).toBe(8);
  });

  it("nets off stock already on order", () => {
    expect(reorderQuantity({ minQuantity: 5, stock: [{ quantity: 2 }] }, 6)).toBe(2);
    expect(reorderQuantity({ minQuantity: 5, stock: [{ quantity: 2 }] }, 10)).toBe(0);
  });

  it("covers per-location shortfalls", () => {
    expect(reorderQuantity({ minQuantity: 0, stock: [{ quantity: 1, minQuantity: 4 }] })).toBe(3);
  });

  it("rounds fractional needs up to whole units", () => {
    expect(reorderQuantity({ minQuantity: 2.5, stock: [{ quantity: 1 }] })).toBe(4);
  });
});

describe("purchase orders", () => {
  it("totals lines, tax and shipping", () => {
    const t = poTotals([{ quantity: 3, unitCost: "19.99" }, { quantity: "0.5", unitCost: 10 }], "4.20", 7);
    expect(t.subtotal).toBe(64.97);
    expect(t.total).toBe(76.17);
  });

  it("derives status from received quantities", () => {
    expect(statusAfterReceipt([{ quantity: 2, unitCost: 1, receivedQuantity: 0 }])).toBe("ORDERED");
    expect(statusAfterReceipt([{ quantity: 2, unitCost: 1, receivedQuantity: 1 }, { quantity: 1, unitCost: 1, receivedQuantity: 0 }])).toBe(
      "PARTIALLY_RECEIVED",
    );
    expect(statusAfterReceipt([{ quantity: 2, unitCost: 1, receivedQuantity: 2 }, { quantity: 1, unitCost: 1, receivedQuantity: 1 }])).toBe("RECEIVED");
  });

  it("never reports negative remaining quantities", () => {
    expect(remainingQty({ quantity: 2, receivedQuantity: 3 })).toBe(0);
  });

  it("lets approvers skip the approval step and blocks cancelling after a receipt", () => {
    expect(poActions("DRAFT", { canApprove: false, hasReceipts: false })).toEqual(["submit", "cancel"]);
    expect(poActions("DRAFT", { canApprove: true, hasReceipts: false })).toEqual(["approve", "cancel"]);
    expect(poActions("PENDING_APPROVAL", { canApprove: false, hasReceipts: false })).toEqual(["cancel"]);
    expect(poActions("ORDERED", { canApprove: true, hasReceipts: true })).toEqual([]);
    expect(poActions("RECEIVED", { canApprove: true, hasReceipts: true })).toEqual([]);
  });
});

describe("work order parts cost", () => {
  it("adds parts into the work order total", () => {
    const parts = [{ quantity: "2", unitCost: "12.50" }, { quantity: 1.5, unitCost: 4 }];
    expect(partsCost(parts)).toBe(31);
    const c = workOrderCosts({ timeEntries: [{ minutes: 60, hourlyRate: 45 }], otherCosts: [{ amount: 10 }], parts });
    expect(c.parts).toBe(31);
    expect(c.total).toBe(86);
  });
});
