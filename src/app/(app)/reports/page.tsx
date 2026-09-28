import { Table } from "@/components/ui";
import { StatTile } from "@/components/charts/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { SERIES } from "@/components/charts/bars";
import { overview } from "@/lib/reports";
import { ExportLink, loadReport, Section } from "./common";

export default async function ReportsOverviewPage({ searchParams }: PageProps<"/reports">) {
  const { ctx, f, t, money, pct, duration, day, bucketLabel, format } = await loadReport(searchParams);
  const o = await overview(ctx, f);
  const labels = o.trend.starts.map((d) => bucketLabel(d, o.trend.grain));
  const decided = (c: { met: number; breached: number }) => t("reports.decided", { met: c.met, total: c.met + c.breached });

  const tiles = [
    { label: t("reports.kpi.opened"), value: format.number(o.opened) },
    { label: t("reports.kpi.completed"), value: format.number(o.completed) },
    { label: t("reports.kpi.openNow"), value: format.number(o.openNow), sub: t("reports.kpi.openNowHint") },
    { label: t("reports.kpi.mttr"), value: duration(o.mttrHours), sub: t("reports.kpi.mttrHint") },
    { label: t("reports.kpi.response"), value: duration(o.medianResponseHours), sub: t("reports.kpi.responseHint") },
    { label: t("reports.kpi.slaResponse"), value: pct(o.slaResponse.pct), sub: decided(o.slaResponse), alert: o.slaResponse.pct !== null && o.slaResponse.pct < 0.9 },
    { label: t("reports.kpi.slaResolution"), value: pct(o.slaResolution.pct), sub: decided(o.slaResolution), alert: o.slaResolution.pct !== null && o.slaResolution.pct < 0.9 },
    { label: t("reports.kpi.pm"), value: pct(o.pm.pct), sub: t("reports.pmSub", { onTime: o.pm.onTime, due: o.pm.due }), alert: o.pm.pct !== null && o.pm.pct < 0.8 },
    { label: t("reports.kpi.cost"), value: money(o.cost), sub: t("reports.kpi.costHint") },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">{t("reports.periodNote", { from: day(f.from), to: day(f.to) })}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((x) => (
          <StatTile key={x.label} {...x} />
        ))}
      </div>

      <Section title={t("reports.trendTitle")} note={t(`reports.grain.${o.trend.grain}`)} actions={<ExportLink kind="work-orders" f={f} label={t("reports.exportWorkOrders")} />}>
        <TrendChart
          ariaLabel={t("reports.trendTitle")}
          labels={labels}
          series={[
            { name: t("reports.kpi.opened"), color: SERIES[0], values: o.trend.counts.opened },
            { name: t("reports.kpi.completed"), color: SERIES[1], values: o.trend.counts.completed },
          ]}
        />
        <details className="mt-4 text-sm [&_summary]:cursor-pointer">
          <summary className="text-xs font-medium text-muted">{t("reports.showTable")}</summary>
          <Table className="mt-2">
            <thead>
              <tr>
                <th>{t("reports.bucket")}</th>
                <th className="text-right">{t("reports.kpi.opened")}</th>
                <th className="text-right">{t("reports.kpi.completed")}</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}>
                  <td>{l}</td>
                  <td className="text-right tabular-nums">{o.trend.counts.opened[i]}</td>
                  <td className="text-right tabular-nums">{o.trend.counts.completed[i]}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </details>
      </Section>
    </div>
  );
}
