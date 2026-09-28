import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, QrCode, Download, Upload } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { AssetStatusBadge, SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { assetFilter } from "./filter";
import { pageOf, PAGE_SIZE, sp } from "@/lib/list";
import { AssetStatus, SystemType } from "@/generated/prisma/enums";

export const metadata = { title: "Assets" };

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const { page, skip, take } = pageOf(params);
  const where = assetFilter(params);
  const query = new URLSearchParams(Object.entries(params).filter(([k, v]) => typeof v === "string" && k !== "page") as [string, string][]);

  const [assets, total, villas] = await Promise.all([
    ctx.db.asset.findMany({
      where,
      include: { villa: { select: { id: true, name: true } }, area: { select: { name: true } } },
      orderBy: [{ villa: { name: "asc" } }, { system: "asc" }, { name: "asc" }],
      skip,
      take,
    }),
    ctx.db.asset.count({ where }),
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const canManage = ctx.can("assets.manage");

  return (
    <>
      <PageHeader
        title={t("nav.assets")}
        description={t("assets.description")}
        actions={
          <>
            {total > 0 && (
              <Link href={`/assets/labels?${query}`}>
                <Button variant="secondary">
                  <QrCode className="size-4" />
                  {t("assets.printLabels")}
                </Button>
              </Link>
            )}
            {total > 0 && (
              <a href="/api/export/assets">
                <Button variant="secondary" title={t("reports.exportCsv")}>
                  <Download className="size-4" />
                  CSV
                </Button>
              </a>
            )}
            {canManage && (
              <Link href="/assets/import">
                <Button variant="secondary">
                  <Upload className="size-4" />
                  {t("assets.import")}
                </Button>
              </Link>
            )}
            {canManage && (
              <Link href={`/assets/new${sp(params, "villaId") ? `?villaId=${sp(params, "villaId")}` : ""}`}>
                <Button>
                  <Plus className="size-4" />
                  {t("assets.new")}
                </Button>
              </Link>
            )}
          </>
        }
      />
      <FilterBar searchPlaceholder={t("assets.searchPlaceholder")}>
        <Select name="villaId" defaultValue={sp(params, "villaId") ?? ""}>
          <option value="">{t("assets.allVillas")}</option>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select name="system" defaultValue={sp(params, "system") ?? ""}>
          <option value="">{t("assets.allSystems")}</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={sp(params, "status") ?? ""}>
          <option value="">{t("assets.allStatuses")}</option>
          {Object.values(AssetStatus).map((s) => (
            <option key={s} value={s}>
              {t(`assetStatus.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="archived" defaultValue={sp(params, "archived") ?? ""}>
          <option value="">{t("common.active")}</option>
          <option value="1">{t("common.archived")}</option>
        </Select>
      </FilterBar>

      {assets.length === 0 ? (
        <EmptyState
          title={query.size ? t("common.noResults") : t("assets.empty")}
          description={villas.length === 0 ? t("assets.needVilla") : undefined}
        />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("assets.system")}</th>
                <th>{t("assets.location")}</th>
                <th className="hidden md:table-cell">{t("assets.model")}</th>
                <th className="hidden lg:table-cell">{t("assets.ipAddress")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/assets/${a.id}`} className="font-medium hover:text-brand">
                      {a.name}
                    </Link>
                    {a.category && <div className="text-xs text-muted">{a.category}</div>}
                  </td>
                  <td>
                    <SystemBadge system={a.system} />
                  </td>
                  <td>
                    <Link href={`/villas/${a.villa.id}`} className="hover:text-brand">
                      {a.villa.name}
                    </Link>
                    {a.area && <div className="text-xs text-muted">{a.area.name}</div>}
                  </td>
                  <td className="hidden text-muted md:table-cell">{[a.manufacturer, a.model].filter(Boolean).join(" ") || "—"}</td>
                  <td className="hidden font-mono text-xs lg:table-cell">{a.ipAddress ?? "—"}</td>
                  <td>
                    <AssetStatusBadge status={a.status} />
                  </td>
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
