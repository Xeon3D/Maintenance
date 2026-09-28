import { getTranslations } from "next-intl/server";
import { getContext } from "@/lib/context";
import { csvResponse, toCsv } from "@/lib/csv";
import { isLowStock, onHand } from "@/lib/inventory-math";

/** Parts with stock per location (one column each) as CSV. */
export async function GET() {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return new Response("Not found", { status: 404 });
  const t = await getTranslations();
  const [parts, locations] = await Promise.all([
    ctx.db.part.findMany({
      where: { archivedAt: null },
      include: { vendor: { select: { name: true } }, stock: { select: { locationId: true, quantity: true, minQuantity: true } } },
      orderBy: { name: "asc" },
    }),
    ctx.db.stockLocation.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);
  const header = [
    t("common.name"), t("parts.sku"), t("parts.barcode"), t("assets.system"), t("assets.manufacturer"), t("assets.model"), t("parts.unit"),
    t("parts.unitCost"), t("parts.minQuantity"), t("parts.vendor"), t("parts.onHand"), t("parts.stockValue"), t("parts.low"),
    ...locations.map((l) => l.name),
  ];
  const rows = parts.map((p) => {
    const stock = p.stock.filter((s) => locations.some((l) => l.id === s.locationId));
    const qty = onHand(stock);
    return [
      p.name, p.sku, p.barcode, p.system ? t(`systems.${p.system}`) : null, p.manufacturer, p.model, p.unit,
      Number(p.unitCost), Number(p.minQuantity), p.vendor?.name, qty, Math.round(qty * Number(p.unitCost) * 100) / 100,
      isLowStock({ minQuantity: p.minQuantity, stock }) ? "✓" : "",
      ...locations.map((l) => Number(stock.find((s) => s.locationId === l.id)?.quantity ?? 0)),
    ];
  });
  return csvResponse(`parts_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, rows));
}
