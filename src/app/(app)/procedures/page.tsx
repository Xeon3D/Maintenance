import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { searchWhere, sp } from "@/lib/list";
import { localizeTemplate, PROCEDURE_TEMPLATES } from "@/lib/procedure-templates";
import { SystemType } from "@/generated/prisma/enums";
import { TemplatePicker } from "./template-picker";

export const metadata = { title: "Procedures" };

export default async function ProceduresPage({ searchParams }: PageProps<"/procedures">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const locale = (await getLocale()) === "pt" ? "pt" : "en";
  const params = await searchParams;
  const system = sp(params, "system");

  const procedures = await ctx.db.procedure.findMany({
    where: {
      archivedAt: sp(params, "archived") === "1" ? { not: null } : null,
      ...(system && system in SystemType ? { system: system as SystemType } : {}),
      ...searchWhere(sp(params, "q"), ["name", "description"]),
    },
    include: { _count: { select: { items: true, pmSchedules: true, workOrders: true } } },
    orderBy: { name: "asc" },
  });
  const total = await ctx.db.procedure.count();
  const canManage = ctx.can("procedures.manage");

  return (
    <>
      <PageHeader
        title={t("nav.procedures")}
        description={t("procedures.description")}
        actions={
          canManage && (
            <Link href="/procedures/new">
              <Button>
                <Plus className="size-4" />
                {t("procedures.new")}
              </Button>
            </Link>
          )
        }
      />

      {canManage && total < 3 && (
        <Card className="mb-6 p-5">
          <h2 className="font-medium">{t("procedures.startersTitle")}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{t("procedures.startersHint")}</p>
          <TemplatePicker
            templates={PROCEDURE_TEMPLATES.map((tpl) => {
              const l = localizeTemplate(tpl, locale);
              return { key: tpl.key, name: l.name, description: l.description, system: tpl.system, steps: l.items.filter((i) => i.type !== "HEADING").length };
            })}
          />
        </Card>
      )}

      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="system" defaultValue={system ?? ""}>
          <option value="">{t("assets.allSystems")}</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
        <Select name="archived" defaultValue={sp(params, "archived") ?? ""}>
          <option value="">{t("common.active")}</option>
          <option value="1">{t("common.archived")}</option>
        </Select>
      </FilterBar>

      {procedures.length === 0 ? (
        <EmptyState title={t("procedures.empty")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("assets.system")}</th>
                <th className="text-right">{t("procedures.steps")}</th>
                <th className="hidden text-right sm:table-cell">{t("procedures.usedBySchedules")}</th>
                <th className="hidden text-right sm:table-cell">{t("nav.workOrders")}</th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td>
                    <Link href={`/procedures/${p.id}`} className="font-medium hover:text-brand">
                      {p.name}
                    </Link>
                    {p.description && <div className="line-clamp-1 text-xs text-muted">{p.description}</div>}
                  </td>
                  <td>{p.system ? <SystemBadge system={p.system} /> : <span className="text-muted">—</span>}</td>
                  <td className="text-right tabular-nums">{p._count.items}</td>
                  <td className="hidden text-right tabular-nums sm:table-cell">{p._count.pmSchedules}</td>
                  <td className="hidden text-right tabular-nums sm:table-cell">{p._count.workOrders}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
