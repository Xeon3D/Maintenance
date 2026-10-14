import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Card, PageHeader, Select, Table } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { VanRestock, type VanPart } from "./van-restock";

export const generateMetadata = titled("van.title");

/** A technician's own van: what's in it, what's short, and loading / returning parts from a warehouse. */
export default async function VanPage({ searchParams }: PageProps<"/parts/van">) {
  const ctx = await getContext();
  if (!ctx.can("inventory.use")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const anyVan = ctx.can("inventory.manage");

  const vans = await ctx.db.stockLocation.findMany({
    where: { type: "VAN", archivedAt: null, ...(anyVan ? {} : { userId: ctx.user.id }) },
    select: { id: true, name: true, userId: true, user: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const mine = vans.filter((v) => v.userId === ctx.user.id);
  const van = vans.find((v) => v.id === sp(params, "van")) ?? mine[0] ?? vans[0];

  const header = (
    <>
      <BackLink href="/parts" label={t("nav.parts")} />
      <PageHeader title={t("van.title")} description={t("van.description")} />
    </>
  );
  if (!van) {
    return (
      <>
        {header}
        <EmptyState title={t("van.noVan")} description={t("van.noVanHint")} />
      </>
    );
  }

  const warehouses = await ctx.db.stockLocation.findMany({ where: { type: "WAREHOUSE", archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const ids = [van.id, ...warehouses.map((w) => w.id)];
  const rows = await ctx.db.part.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, sku: true, barcode: true, unit: true, stock: { where: { locationId: { in: ids } }, select: { locationId: true, quantity: true, minQuantity: true } } },
    orderBy: { name: "asc" },
  });
  const parts: VanPart[] = rows.map((p) => {
    const inVan = p.stock.find((s) => s.locationId === van.id);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      inVan: Number(inVan?.quantity ?? 0),
      vanMin: inVan?.minQuantity != null ? Number(inVan.minQuantity) : null,
      stock: Object.fromEntries(p.stock.filter((s) => s.locationId !== van.id).map((s) => [s.locationId, Number(s.quantity)])),
    };
  });
  const carried = parts.filter((p) => p.inVan > 0 || p.vanMin !== null);

  return (
    <>
      {header}
      {vans.length > 1 && (
        <form className="mb-4 flex items-center gap-2 text-sm">
          <label htmlFor="van" className="text-muted">
            {t("van.choose")}
          </label>
          <Select id="van" name="van" defaultValue={van.id} className="w-auto">
            {vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.user ? ` — ${v.user.name}` : ""}
              </option>
            ))}
          </Select>
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 hover:border-brand">
            {t("van.open")}
          </button>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium">{van.name}</h2>
            <p className="text-xs text-muted">{t("van.inVanHint")}</p>
          </div>
          {carried.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">{t("van.empty")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t("van.part")}</th>
                  <th className="text-right">{t("van.inVan")}</th>
                  <th className="text-right">{t("van.min")}</th>
                </tr>
              </thead>
              <tbody>
                {carried.map((p) => {
                  const short = p.vanMin !== null && p.inVan < p.vanMin;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/parts/${p.id}`} className="font-medium hover:text-brand">
                          {p.name}
                        </Link>
                        {p.sku && <div className="font-mono text-xs text-muted">{p.sku}</div>}
                      </td>
                      <td className={cn("text-right tabular-nums", short && "font-medium text-danger")}>
                        {p.inVan} {p.unit}
                      </td>
                      <td className="text-right tabular-nums text-muted">{p.vanMin ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-medium">{t("van.restock")}</h2>
          {warehouses.length === 0 ? (
            <p className="text-sm text-muted">{t("van.noWarehouse")}</p>
          ) : (
            <VanRestock key={van.id} vanId={van.id} warehouses={warehouses} parts={parts} />
          )}
        </Card>
      </div>
    </>
  );
}
