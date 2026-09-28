import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, searchWhere, sp } from "@/lib/list";
import { ContractStatus } from "@/generated/prisma/enums";
import { ContractStatusBadge } from "./status-badge";

export const metadata = { title: "Service contracts" };

export default async function ContractsPage({ searchParams }: PageProps<"/contracts">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const q = sp(params, "q");
  const status = sp(params, "status") as ContractStatus | undefined;
  const clientId = sp(params, "clientId");
  const { page, skip, take } = pageOf(params);

  const where = {
    ...(status && Object.values(ContractStatus).includes(status) ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...searchWhere(q, ["name", "notes"]),
  };
  const [contracts, total, clients] = await Promise.all([
    ctx.db.serviceContract.findMany({
      where,
      include: { client: { select: { id: true, name: true } }, villa: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      skip,
      take,
    }),
    ctx.db.serviceContract.count({ where }),
    ctx.db.client.findMany({ where: { contracts: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeZone: "UTC" });
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });

  return (
    <>
      <PageHeader
        title={t("nav.contracts")}
        description={t("contracts.description")}
        actions={
          ctx.can("contracts.manage") && (
            <Link href="/contracts/new">
              <Button>
                <Plus className="size-4" />
                {t("contracts.new")}
              </Button>
            </Link>
          )
        }
      />
      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="status" defaultValue={status ?? ""}>
          <option value="">{t("wo.statusAll")}</option>
          {Object.values(ContractStatus).map((s) => (
            <option key={s} value={s}>
              {t(`contractStatus.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="clientId" defaultValue={clientId ?? ""}>
          <option value="">{t("contracts.allClients")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FilterBar>

      {contracts.length === 0 ? (
        <EmptyState title={q || status || clientId ? t("common.noResults") : t("contracts.empty")} description={q ? undefined : t("contracts.emptyHint")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("contracts.contract")}</th>
                <th>{t("common.status")}</th>
                <th>{t("contracts.period")}</th>
                <th>{t("contracts.sla")}</th>
                <th className="text-right">{t("contracts.monthlyFee")}</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/contracts/${c.id}`} className="font-medium hover:text-brand">
                      {c.name}
                    </Link>
                    <div className="text-xs text-muted">
                      {c.client.name} · {c.villa?.name ?? t("contracts.allVillas")}
                    </div>
                  </td>
                  <td>
                    <ContractStatusBadge status={c.status} endDate={c.endDate} />
                  </td>
                  <td className="whitespace-nowrap text-sm text-muted">
                    {date(c.startDate)} – {c.endDate ? date(c.endDate) : t("contracts.openEnded")}
                  </td>
                  <td className="text-sm">
                    {c.responseTimeHours || c.resolutionTimeHours
                      ? t("contracts.slaShort", { response: c.responseTimeHours ?? "—", resolution: c.resolutionTimeHours ?? "—" })
                      : "—"}
                  </td>
                  <td className="text-right tabular-nums">{c.monthlyFee != null ? money(Number(c.monthlyFee)) : "—"}</td>
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
