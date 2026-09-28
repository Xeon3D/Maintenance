import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { PoStatusBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, sp } from "@/lib/list";
import { PO_OPEN_STATUSES, poTotals } from "@/lib/inventory-math";
import { PurchaseOrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export const metadata = { title: "Purchase orders" };

export default async function PurchaseOrdersPage({ searchParams }: PageProps<"/purchase-orders">) {
  const ctx = await getContext();
  if (!ctx.can("purchasing.manage")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const q = sp(params, "q");
  const statusParam = sp(params, "status") ?? "open";
  const vendorId = sp(params, "vendorId");
  const { page, skip, take } = pageOf(params);

  const statusWhere =
    statusParam === "open"
      ? { status: { in: PO_OPEN_STATUSES } }
      : Object.values(PurchaseOrderStatus).includes(statusParam as PurchaseOrderStatus)
        ? { status: statusParam as PurchaseOrderStatus }
        : {};
  const num = q?.replace(/^po-?/i, "");
  const where = {
    ...statusWhere,
    ...(vendorId ? { vendorId } : {}),
    ...(q
      ? {
          OR: [
            ...(num && /^\d+$/.test(num) ? [{ number: Number(num) }] : []),
            { vendor: { name: { contains: q, mode: "insensitive" as const } } },
            { notes: { contains: q, mode: "insensitive" as const } },
            { lines: { some: { description: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [pos, total, vendors] = await Promise.all([
    ctx.db.purchaseOrder.findMany({
      where,
      include: { vendor: { select: { name: true } }, lines: { select: { quantity: true, unitCost: true } } },
      orderBy: { number: "desc" },
      skip,
      take,
    }),
    ctx.db.purchaseOrder.count({ where }),
    ctx.db.vendor.findMany({ where: { purchaseOrders: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });
  const today = new Date();

  return (
    <>
      <PageHeader
        title={t("nav.purchaseOrders")}
        description={t("po.description")}
        actions={
          <Link href="/purchase-orders/new">
            <Button>
              <Plus className="size-4" />
              {t("po.new")}
            </Button>
          </Link>
        }
      />
      <FilterBar searchPlaceholder={t("po.searchPlaceholder")}>
        <Select name="status" defaultValue={statusParam}>
          <option value="open">{t("po.statusOpen")}</option>
          <option value="all">{t("wo.statusAll")}</option>
          {Object.values(PurchaseOrderStatus).map((s) => (
            <option key={s} value={s}>
              {t(`poStatus.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="vendorId" defaultValue={vendorId ?? ""}>
          <option value="">{t("po.allVendors")}</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {pos.length === 0 ? (
        <EmptyState title={q || vendorId || statusParam !== "open" ? t("common.noResults") : t("po.empty")} description={q ? undefined : t("po.emptyHint")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("po.number")}</th>
                <th>{t("po.vendor")}</th>
                <th>{t("common.status")}</th>
                <th>{t("po.expectedDate")}</th>
                <th className="text-right">{t("po.total")}</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => {
                const late = po.expectedDate && po.expectedDate < today && (po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED");
                return (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td>
                      <Link href={`/purchase-orders/${po.id}`} className="font-medium hover:text-brand">
                        PO-{po.number}
                      </Link>
                      <div className="text-xs text-muted">{format.dateTime(po.createdAt, { dateStyle: "medium" })}</div>
                    </td>
                    <td>{po.vendor.name}</td>
                    <td>
                      <PoStatusBadge status={po.status} />
                    </td>
                    <td className={cn("text-sm", late ? "font-medium text-danger" : "text-muted")}>
                      {po.expectedDate ? format.dateTime(po.expectedDate, { dateStyle: "medium" }) : "—"}
                    </td>
                    <td className="text-right tabular-nums">{money(poTotals(po.lines, po.tax, po.shipping).total)}</td>
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
