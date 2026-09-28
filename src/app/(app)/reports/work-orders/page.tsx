import { Table } from "@/components/ui";
import { BarList } from "@/components/charts/bars";
import { StatTile } from "@/components/charts/stat-tile";
import { workOrderBreakdown } from "@/lib/reports";
import { ExportLink, loadReport, Section } from "../common";

export default async function WorkOrderReportPage({ searchParams }: PageProps<"/reports/work-orders">) {
  const { ctx, f, t, pct, duration, day, format } = await loadReport(searchParams);
  const b = await workOrderBreakdown(ctx, f);
  const systemName = (s: string) => (s === "NONE" ? t("reports.noSystem") : t(`systems.${s}`));
  const bars = (rows: [string, number][], name: (k: string) => string) =>
    rows.map(([k, v]) => ({ key: k, label: name(k), value: v, display: format.number(v) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("reports.periodNote", { from: day(f.from), to: day(f.to) })}</p>
        <ExportLink kind="work-orders" f={f} label={t("reports.exportWorkOrders")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("reports.byType")}>
          <BarList rows={bars(b.byType, (k) => t(`woType.${k}`))} empty={t("reports.noData")} />
        </Section>
        <Section title={t("reports.bySystem")}>
          <BarList rows={bars(b.bySystem, systemName)} empty={t("reports.noData")} />
        </Section>
        <Section title={t("reports.byPriority")}>
          <BarList rows={bars(b.byPriority, (k) => t(`priority.${k}`))} empty={t("reports.noData")} />
        </Section>
        <Section title={t("reports.byVilla")} note={t("reports.top10")}>
          <BarList rows={bars(b.byVilla, (k) => k)} empty={t("reports.noData")} />
        </Section>
      </div>

      <Section title={t("reports.repairTime")} note={t("reports.repairTimeNote")}>
        {b.repairBySystem.length === 0 ? (
          <p className="text-sm text-muted">{t("reports.noData")}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {(
              [
                [t("assets.system"), b.repairBySystem, systemName],
                [t("wo.priority"), b.repairByPriority, (k: string) => t(`priority.${k}`)],
              ] as const
            ).map(([head, rows, name]) => (
              <Table key={head}>
                <thead>
                  <tr>
                    <th>{head}</th>
                    <th className="text-right">{t("reports.jobs")}</th>
                    <th className="text-right">{t("reports.average")}</th>
                    <th className="text-right">{t("reports.median")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td>{name(r.key)}</td>
                      <td className="text-right tabular-nums">{r.count}</td>
                      <td className="text-right tabular-nums">{duration(r.mean)}</td>
                      <td className="text-right tabular-nums">{duration(r.median)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("reports.pmTitle")} note={t("reports.pmNote")}>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("reports.kpi.pm")} value={pct(b.pm.pct)} alert={b.pm.pct !== null && b.pm.pct < 0.8} />
          <StatTile label={t("reports.pmOnTime")} value={format.number(b.pm.onTime)} />
          <StatTile label={t("reports.pmLate")} value={format.number(b.pm.late)} />
          <StatTile label={t("reports.pmMissed")} value={format.number(b.pm.missed)} alert={b.pm.missed > 0} />
        </div>
        {b.pmByVilla.length > 0 && (
          <Table>
            <thead>
              <tr>
                <th>{t("assets.villa")}</th>
                <th className="text-right">{t("reports.pmDue")}</th>
                <th className="text-right">{t("reports.pmOnTime")}</th>
                <th className="text-right">{t("reports.pmLate")}</th>
                <th className="text-right">{t("reports.pmMissed")}</th>
                <th className="text-right">{t("reports.kpi.pm")}</th>
              </tr>
            </thead>
            <tbody>
              {b.pmByVilla.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td className="text-right tabular-nums">{v.due}</td>
                  <td className="text-right tabular-nums">{v.onTime}</td>
                  <td className="text-right tabular-nums">{v.late}</td>
                  <td className="text-right tabular-nums">{v.missed}</td>
                  <td className="text-right font-medium tabular-nums">{pct(v.pct)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}
