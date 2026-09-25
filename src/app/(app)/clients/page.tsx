import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, searchWhere, sp } from "@/lib/list";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const q = sp(params, "q");
  const archived = sp(params, "archived") === "1";
  const { page, skip, take } = pageOf(params);

  const where = {
    archivedAt: archived ? { not: null } : null,
    ...searchWhere(q, ["name", "email", "phone"]),
  };
  const [clients, total] = await Promise.all([
    ctx.db.client.findMany({
      where,
      include: {
        _count: { select: { villas: { where: { archivedAt: null } } } },
        contacts: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    ctx.db.client.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title={t("nav.clients")}
        description={t("clients.description")}
        actions={
          ctx.can("clients.manage") && (
            <Link href="/clients/new">
              <Button>
                <Plus className="size-4" />
                {t("clients.new")}
              </Button>
            </Link>
          )
        }
      />
      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="archived" defaultValue={archived ? "1" : ""}>
          <option value="">{t("common.active")}</option>
          <option value="1">{t("common.archived")}</option>
        </Select>
      </FilterBar>

      {clients.length === 0 ? (
        <EmptyState title={q ? t("common.noResults") : t("clients.empty")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("clients.type")}</th>
                <th>{t("clients.primaryContact")}</th>
                <th className="text-right">{t("nav.villas")}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/clients/${c.id}`} className="font-medium hover:text-brand">
                      {c.name}
                    </Link>
                    {c.email && <div className="text-xs text-muted">{c.email}</div>}
                  </td>
                  <td className="text-muted">{t(`clientType.${c.type}`)}</td>
                  <td>
                    {c.contacts[0] ? (
                      <>
                        {c.contacts[0].name}
                        {c.contacts[0].phone && <div className="text-xs text-muted">{c.contacts[0].phone}</div>}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">{c._count.villas}</td>
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
