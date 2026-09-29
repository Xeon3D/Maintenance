import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getFormatter, getTranslations } from "next-intl/server";
import { getContext } from "@/lib/context";
import { poTotals } from "@/lib/inventory-math";
import { PurchaseOrderPdf, type PoPdfData } from "./po-pdf";
import { letterhead } from "@/lib/letterhead";

export async function GET(_req: Request, { params }: RouteContext<"/purchase-orders/[id]/pdf">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("purchasing.manage")) return new Response("Not found", { status: 404 });
  const t = await getTranslations();
  const format = await getFormatter();

  const po = await ctx.db.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: true,
      shipTo: { select: { name: true } },
      lines: { include: { part: { select: { sku: true, unit: true } } }, orderBy: { id: "asc" } },
    },
  });
  if (!po) return new Response("Not found", { status: 404 });

  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });
  const totals = poTotals(po.lines, po.tax, po.shipping);

  const data: PoPdfData = {
    labels: {
      title: t("po.pdfTitle"),
      vendor: t("po.vendor"),
      shipTo: t("po.shipTo"),
      expected: t("po.expectedDate"),
      item: t("po.item"),
      qty: t("stock.quantity"),
      unitCost: t("parts.unitCost"),
      lineTotal: t("po.lineTotal"),
      total: t("po.total"),
      notes: t("common.notes"),
    },
    lh: await letterhead(ctx.organization, t("company.taxIdShort")),
    number: po.number,
    date: date(po.orderDate ?? po.createdAt),
    vendor: {
      name: po.vendor.name,
      lines: [po.vendor.address, po.vendor.email, po.vendor.phone, po.vendor.taxId && `${t("clients.taxId")}: ${po.vendor.taxId}`].filter(
        (x): x is string => !!x,
      ),
    },
    shipTo: po.shipTo?.name ?? null,
    expected: po.expectedDate ? date(po.expectedDate) : null,
    lines: po.lines.map((l) => ({
      description: l.description,
      sku: l.part?.sku ?? null,
      qty: `${format.number(Number(l.quantity))}${l.part?.unit ? ` ${l.part.unit}` : ""}`,
      unitCost: money(Number(l.unitCost)),
      total: money(Number(l.quantity) * Number(l.unitCost)),
    })),
    totals: [
      [t("po.subtotal"), money(totals.subtotal)],
      ...(totals.tax ? [[t("po.tax"), money(totals.tax)] as [string, string]] : []),
      ...(totals.shipping ? [[t("po.shipping"), money(totals.shipping)] as [string, string]] : []),
    ],
    total: money(totals.total),
    notes: po.notes,
  };

  const pdf = await renderToBuffer(createElement(PurchaseOrderPdf, { d: data }) as unknown as ReactElement<DocumentProps>);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PO-${po.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
