import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Plus, Warehouse } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { LowStockBadge, SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, searchWhere, sp } from "@/lib/list";
import { lowStockParts } from "@/lib/inventory";
import { isLowStock, onHand } from "@/lib/inventory-math";
import { SystemType } from "@/generated/prisma/enums";
import { ReorderButton } from "./reorder-button";

export const metadata = { title: "Parts & inventory" };

export default async function PartsPage({ searchParams }: PageProps<"/parts">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const q = sp(params, "q");
  const archived = sp(params, "archived") === "1";
  const lowOnly = sp(params, "stock") === "low";
  const system = sp(params, "system") as SystemType | undefined;
  const locationId = sp(params, "location");
  const { page, skip, take } = pageOf(params);

  const [locations, low] = await Promise.all([
    ctx.db.stockLocation.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    lowStockParts(ctx.db),
  ]);
  const location = locations.find((l) => l.id === locationId);

  const where = {
    archivedAt: archived ? { not: null } : null,
    ...(system && Object.values(SystemType).includes(system) ? { system } : {}),
    ...(location ? { stock: { some: { locationId: location.id } } } : {}),
    ...(lowOnly ? { id: { in: low.map((p) => p.id) } } : {}),
    ...searchWhere(q, ["name", "sku", "barcode", "manufacturer", "model"]),
  };
  const [parts, total] = await Promise.all([
    ctx.db.part.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        stock: { where: { location: { archivedAt: null } }, select: { locationId: true, quantity: true, minQuantity: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    ctx.db.part.count({ where }),
  ]);
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });

  return (
    <>
      <PageHeader
        title={t("nav.parts")}
        description={t("parts.description")}
        actions={
          <>
            {ctx.can("purchasing.manage") && <ReorderButton count={low.length} />}
            <Link href="/parts/locations">
              <Button variant="secondary">
                <Warehouse className="size-4" />
                {t("stock.locations")}
              </Button>
            </Link>
            {ctx.can("inventory.manage") && (
              <Link href="/parts/new">
                <Button>
                  <Plus className="size-4" />
                  {t("parts.new")}
                </Button>
              </Link>
            )}
          </>
        }
      />
      <FilterBar searchPlaceholder={t("parts.searchPlaceholder")}>
        <Select name="stock" defaultValue={lowOnly ? "low" : ""}>
          <option value="">{t("parts.allStock")}</option>
          <option value="low">{t("parts.lowOnly", { count: low.length })}</option>
        </Select>
        <Select name="location" defaultValue={location?.id ?? ""}>
          <option value="">{t("stock.allLocations")}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select name="system" defaultValue={system ?? ""}>
          <option value="">{t("assets.allSystems")}</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="archived" defaultValue={archived ? "1" : ""}>
          <option value="">{t("common.active")}</option>
          <option value="1">{t("common.archived")}</option>
        </Select>
      </FilterBar>

      {parts.length === 0 ? (
        <EmptyState
          title={q || lowOnly || system || location ? t("common.noResults") : t("parts.empty")}
          description={q || lowOnly || system || location ? undefined : t("parts.emptyHint")}
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("parts.part")}</th>
                <th>{t("assets.system")}</th>
                <th className="text-right">{location ? location.name : t("parts.onHand")}</th>
                <th className="text-right">{t("parts.minQuantity")}</th>
                <th className="text-right">{t("parts.unitCost")}</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const here = location ? p.stock.find((s) => s.locationId === location.id) : null;
                const qty = location ? Number(here?.quantity ?? 0) : onHand(p.stock);
                const min = location ? (here?.minQuantity ?? null) : p.minQuantity;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td>
                      <Link href={`/parts/${p.id}`} className="font-medium hover:text-brand">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted">
                        {[p.sku, [p.manufacturer, p.model].filter(Boolean).join(" "), p.vendor?.name].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td>{p.system && <SystemBadge system={p.system} />}</td>
                    <td className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        {isLowStock(p) && <LowStockBadge />}
                        {format.number(qty)} <span className="text-xs text-muted">{p.unit}</span>
                      </span>
                    </td>
                    <td className="text-right tabular-nums text-muted">{min != null && Number(min) > 0 ? format.number(Number(min)) : "—"}</td>
                    <td className="text-right tabular-nums">{money(Number(p.unitCost))}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
