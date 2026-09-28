import type { PurchaseOrderStatus } from "@/generated/prisma/enums";

// Pure stock / purchasing arithmetic (no DB). Quantities are Decimal(12,3), money Decimal(12,2);
// Prisma hands both over as Decimal objects, so everything goes through Number() first.

type Num = number | string | { toString(): string } | null | undefined;

const n = (v: Num) => (v == null ? 0 : Number(v));

/** Rounds to the 3 decimals quantities are stored with (avoids 0.1 + 0.2 drift). */
export const roundQty = (v: number) => Math.round(v * 1000) / 1000;
export const roundMoney = (v: number) => Math.round(v * 100) / 100;

export type StockRow = { quantity: Num; minQuantity?: Num };

/** Total on hand across locations. */
export function onHand(stock: StockRow[]) {
  return roundQty(stock.reduce((s, r) => s + n(r.quantity), 0));
}

/**
 * A part is low when its org-wide total is at or below the part's reorder point, or when any
 * location with its own minimum (e.g. a van kit) is at or below that. A minimum of 0 means "not tracked".
 */
export function isLowStock(part: { minQuantity: Num; stock: StockRow[] }) {
  const min = n(part.minQuantity);
  if (min > 0 && onHand(part.stock) <= min) return true;
  return part.stock.some((r) => r.minQuantity != null && n(r.minQuantity) > 0 && n(r.quantity) <= n(r.minQuantity));
}

/** Quantity to reorder: enough to reach twice the reorder point, net of what is already on order. */
export function reorderQuantity(part: { minQuantity: Num; stock: StockRow[] }, onOrder = 0) {
  const min = n(part.minQuantity);
  const target = min > 0 ? min * 2 : 0;
  const perLocationGap = part.stock.reduce(
    (s, r) => s + (r.minQuantity != null && n(r.minQuantity) > n(r.quantity) ? n(r.minQuantity) - n(r.quantity) : 0),
    0,
  );
  const need = Math.max(target - onHand(part.stock), perLocationGap) - onOrder;
  return need > 0 ? Math.ceil(roundQty(need)) : 0;
}

export type PoLine = { quantity: Num; unitCost: Num; receivedQuantity?: Num };

export function poTotals(lines: PoLine[], tax: Num = 0, shipping: Num = 0) {
  const subtotal = roundMoney(lines.reduce((s, l) => s + n(l.quantity) * n(l.unitCost), 0));
  return { subtotal, tax: n(tax), shipping: n(shipping), total: roundMoney(subtotal + n(tax) + n(shipping)) };
}

export const remainingQty = (l: { quantity: Num; receivedQuantity?: Num }) => roundQty(Math.max(0, n(l.quantity) - n(l.receivedQuantity)));

/** Status after a receipt: fully received, partly received, or unchanged (nothing received yet). */
export function statusAfterReceipt(lines: PoLine[]): PurchaseOrderStatus {
  const received = lines.some((l) => n(l.receivedQuantity) > 0);
  if (lines.length > 0 && lines.every((l) => remainingQty(l) === 0)) return "RECEIVED";
  return received ? "PARTIALLY_RECEIVED" : "ORDERED";
}

export type PoAction = "submit" | "approve" | "reject" | "order" | "cancel" | "reopen";

/**
 * Allowed purchase-order transitions. Approvers can approve straight from a draft; everyone
 * else submits it for approval. Only drafts can be edited; a PO with receipts can't be cancelled.
 */
export function poActions(status: PurchaseOrderStatus, opts: { canApprove: boolean; hasReceipts: boolean }): PoAction[] {
  const a: PoAction[] = [];
  switch (status) {
    case "DRAFT":
      a.push(opts.canApprove ? "approve" : "submit", "cancel");
      break;
    case "PENDING_APPROVAL":
      if (opts.canApprove) a.push("approve", "reject");
      a.push("cancel");
      break;
    case "APPROVED":
      a.push("order", "cancel");
      break;
    case "ORDERED":
      if (!opts.hasReceipts) a.push("cancel");
      break;
    case "CANCELLED":
      a.push("reopen");
      break;
  }
  return a;
}

export const PO_OPEN_STATUSES: PurchaseOrderStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"];
export const PO_RECEIVABLE: PurchaseOrderStatus[] = ["ORDERED", "PARTIALLY_RECEIVED"];

/** Parts cost of a work order. */
export function partsCost(parts: { quantity: Num; unitCost: Num }[]) {
  return roundMoney(parts.reduce((s, p) => s + n(p.quantity) * n(p.unitCost), 0));
}

/** Compact quantity for display: 3 → "3", 2.5 → "2.5", 0.125 → "0.125". */
export function fmtQty(v: Num) {
  return String(roundQty(n(v)));
}
