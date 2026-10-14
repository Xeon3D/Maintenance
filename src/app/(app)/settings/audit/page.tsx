import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar, Pagination } from "@/components/list-controls";
import { DateInput } from "@/components/date-input";
import { EmptyState } from "@/components/empty-state";
import { getContext } from "@/lib/context";
import { pageOf, PAGE_SIZE, sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { AUDIT_CATEGORIES, auditWhere, categoryOf, ENTITY_PATHS } from "@/lib/audit-filter";
import { auditText } from "@/lib/audit-text";
import { cn } from "@/lib/utils";

export const generateMetadata = titled("nav.audit");

const BADGE: Record<string, string> = {
  security: "bg-red-500/10 text-red-700 dark:text-red-300",
  users: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  records: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  server: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  const ctx = await getContext();
  if (!ctx.can("audit.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const { page, skip, take } = pageOf(params);
  const where = auditWhere(params, ctx.organization.timezone);
  const query = new URLSearchParams(Object.entries(params).filter(([k, v]) => typeof v === "string" && v && k !== "page") as [string, string][]);

  const [entries, total, people, entities] = await Promise.all([
    ctx.db.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip, take }),
    ctx.db.auditLog.count({ where }),
    ctx.db.membership.findMany({ select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    ctx.db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);
  const text = auditText(t, format);
  // Links only for records that still exist (deleted ones keep their name in the entry).
  const live = new Set<string>();
  await Promise.all(
    Object.keys(ENTITY_PATHS).map(async (type) => {
      const ids = [...new Set(entries.filter((e) => e.entityType === type).map((e) => e.entityId))];
      if (!ids.length) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: { id: string }[] = await (ctx.db as any)[type[0].toLowerCase() + type.slice(1)].findMany({ where: { id: { in: ids } }, select: { id: true } });
      for (const r of rows) live.add(`${type}:${r.id}`);
    }),
  );

  return (
    <>
      <PageHeader
        title={t("nav.audit")}
        description={t("audit.description")}
        actions={
          total > 0 && (
            <a href={`/api/export/audit${query.size ? `?${query}` : ""}`}>
              <Button variant="secondary" title={t("reports.exportCsv")}>
                <Download className="size-4" />
                CSV
              </Button>
            </a>
          )
        }
      />
      <FilterBar searchPlaceholder={t("audit.searchPlaceholder")}>
        <Select name="category" defaultValue={sp(params, "category") ?? ""} aria-label={t("audit.category")}>
          <option value="">{t("audit.allCategories")}</option>
          {AUDIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`audit.categories.${c}`)}
            </option>
          ))}
        </Select>
        <Select name="userId" defaultValue={sp(params, "userId") ?? ""} aria-label={t("audit.user")}>
          <option value="">{t("audit.allUsers")}</option>
          <option value="system">{t("audit.system")}</option>
          {people.map((p) => (
            <option key={p.user.id} value={p.user.id}>
              {p.user.name}
            </option>
          ))}
        </Select>
        <Select name="entity" defaultValue={sp(params, "entity") ?? ""} aria-label={t("audit.entity")}>
          <option value="">{t("audit.allEntities")}</option>
          {entities
            .map((e) => ({ value: e.entityType, label: text.entityTitle(e.entityType) }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
        </Select>
        <DateInput name="from" defaultValue={sp(params, "from")} aria-label={t("audit.from")} className="w-40" />
        <DateInput name="to" defaultValue={sp(params, "to")} aria-label={t("audit.to")} className="w-40" />
      </FilterBar>

      {entries.length === 0 ? (
        <EmptyState title={query.size ? t("common.noResults") : t("audit.empty")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("audit.when")}</th>
                <th>{t("audit.user")}</th>
                <th>{t("audit.what")}</th>
                <th className="hidden lg:table-cell">{t("audit.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const cat = categoryOf(e);
                const label = text.label(e);
                const href = ENTITY_PATHS[e.entityType] && live.has(`${e.entityType}:${e.entityId}`) ? `${ENTITY_PATHS[e.entityType]}/${e.entityId}` : null;
                const details = text.details(e);
                return (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap tabular-nums text-muted">{format.dateTime(e.createdAt, { dateStyle: "short", timeStyle: "medium" })}</td>
                    <td className="whitespace-nowrap">{e.user?.name ?? <span className="text-muted">{e.userId ? t("audit.removedUser") : t("audit.system")}</span>}</td>
                    <td className="min-w-64">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", BADGE[cat])}>{t(`audit.categories.${cat}`)}</span>
                        <span className="font-medium">{text.action(e)}</span>
                        {href ? (
                          <Link href={href} className="text-brand hover:underline">
                            {label ?? t("audit.open")}
                          </Link>
                        ) : (
                          label && <span className="text-muted">{label}</span>
                        )}
                      </div>
                      {details.length > 0 && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-muted hover:text-brand">{t("audit.details", { count: details.length })}</summary>
                          <dl className="mt-1 grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-0.5">
                            {details.map((d) => (
                              <div key={d.field} className="contents">
                                <dt className="text-muted">{d.field}</dt>
                                <dd className="break-words">
                                  {d.before !== undefined && (
                                    <>
                                      <span className="text-muted line-through decoration-muted/60">{d.before}</span> →{" "}
                                    </>
                                  )}
                                  <span>{d.after}</span>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </td>
                    <td className="hidden font-mono text-xs text-muted lg:table-cell">{e.ip ?? "—"}</td>
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
