import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, searchWhere, sp } from "@/lib/list";
import { SystemType, VendorType } from "@/generated/prisma/enums";

export const metadata = { title: "Vendors" };

export default async function VendorsPage({ searchParams }: PageProps<"/vendors">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const q = sp(params, "q");
  const archived = sp(params, "archived") === "1";
  const type = sp(params, "type") as VendorType | undefined;
  const system = sp(params, "system") as SystemType | undefined;
  const { page, skip, take } = pageOf(params);

  const where = {
    archivedAt: archived ? { not: null } : null,
    ...(type && Object.values(VendorType).includes(type) ? { type } : {}),
    ...(system && Object.values(SystemType).includes(system) ? { systems: { has: system } } : {}),
    ...searchWhere(q, ["name", "email", "phone"]),
  };
  const [vendors, total] = await Promise.all([
    ctx.db.vendor.findMany({
      where,
      include: { _count: { select: { parts: { where: { archivedAt: null } }, purchaseOrders: true } } },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    ctx.db.vendor.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title={t("nav.vendors")}
        description={t("vendors.description")}
        actions={
          ctx.can("vendors.manage") && (
            <Link href="/vendors/new">
              <Button>
                <Plus className="size-4" />
                {t("vendors.new")}
              </Button>
            </Link>
          )
        }
      />
      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="type" defaultValue={type ?? ""}>
          <option value="">{t("vendors.allTypes")}</option>
          {Object.values(VendorType).map((v) => (
            <option key={v} value={v}>
              {t(`vendorType.${v}`)}
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

      {vendors.length === 0 ? (
        <EmptyState title={q || type || system ? t("common.noResults") : t("vendors.empty")} description={q ? undefined : t("vendors.emptyHint")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("vendors.type")}</th>
                <th>{t("vendors.systems")}</th>
                <th className="text-right">{t("nav.parts")}</th>
                <th className="text-right">{t("nav.purchaseOrders")}</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/vendors/${v.id}`} className="font-medium hover:text-brand">
                      {v.name}
                    </Link>
                    {(v.email || v.phone) && <div className="text-xs text-muted">{[v.email, v.phone].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td className="text-muted">{t(`vendorType.${v.type}`)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {v.systems.map((s) => (
                        <SystemBadge key={s} system={s} />
                      ))}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{v._count.parts}</td>
                  <td className="text-right tabular-nums">{v._count.purchaseOrders}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
