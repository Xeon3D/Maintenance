import { Table } from "@/components/ui";
import { BarList, StackedBars } from "@/components/charts/bars";
import { StatTile } from "@/components/charts/stat-tile";
import { costReport } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { ExportLink, loadReport, Section } from "../common";

const TOP = 12;

export default async function CostReportPage({ searchParams }: PageProps<"/reports/costs">) {
  const { ctx, f, t, money, day } = await loadReport(searchParams);
  const c = await costReport(ctx, f);
  const kinds = [t("costs.labor"), t("costs.parts"), t("reports.otherCosts")];
  const showFees = !f.system; // fees aren't per system
  const systemName = (s: string) => (s === "NONE" ? t("reports.noSystem") : t(`systems.${s}`));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("reports.costNote", { from: day(f.from), to: day(f.to) })}</p>
        <ExportLink kind="costs" f={f} label={t("reports.exportCsv")} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={t("reports.kpi.cost")} value={money(c.totals.total)} sub={t("reports.jobCount", { count: c.rows.length })} />
        <StatTile label={t("costs.labor")} value={money(c.totals.labor)} />
        <StatTile label={t("costs.parts")} value={money(c.totals.parts)} />
        <StatTile label={t("reports.otherCosts")} value={money(c.totals.other)} />
      </div>

      <Section title={t("reports.costByVilla")} note={c.byVilla.length > TOP ? t("reports.topN", { n: TOP }) : undefined}>
        <StackedBars
          series={kinds}
          empty={t("reports.noCosts")}
          rows={c.byVilla.slice(0, TOP).map((v) => ({
            key: v.id,
            label: v.name,
            href: `/villas/${v.id}`,
            values: [v.labor, v.parts, v.other],
            displays: [money(v.labor), money(v.parts), money(v.other)],
            total: money(v.total),
            totalValue: v.total,
          }))}
        />
      </Section>

      <Section title={t("reports.costByClient")} note={showFees ? t("reports.feesNote") : undefined}>
        {c.byClient.length === 0 ? (
          <p className="text-sm text-muted">{t("reports.noCosts")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("villas.client")}</th>
                <th className="text-right">{t("reports.jobs")}</th>
                <th className="text-right">{t("costs.labor")}</th>
                <th className="text-right">{t("costs.parts")}</th>
                <th className="text-right">{t("reports.otherCosts")}</th>
                <th className="text-right">{t("costs.total")}</th>
                {showFees && <th className="text-right">{t("reports.fees")}</th>}
                {showFees && <th className="text-right">{t("reports.margin")}</th>}
              </tr>
            </thead>
            <tbody>
              {c.byClient.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-right tabular-nums">{r.count}</td>
                  <td className="text-right tabular-nums">{money(r.labor)}</td>
                  <td className="text-right tabular-nums">{money(r.parts)}</td>
                  <td className="text-right tabular-nums">{money(r.other)}</td>
                  <td className="text-right font-medium tabular-nums">{money(r.total)}</td>
                  {showFees && <td className="text-right tabular-nums">{r.fees ? money(r.fees) : "—"}</td>}
                  {showFees && (
                    <td className={cn("text-right tabular-nums", r.fees && r.fees - r.total < 0 && "font-medium text-danger")}>{r.fees ? money(r.fees - r.total) : "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title={t("reports.costBySystem")}>
        <BarList
          rows={c.bySystem.filter((s) => s.total > 0).map((s) => ({ key: s.id, label: systemName(s.id), value: s.total, display: money(s.total) }))}
          empty={t("reports.noCosts")}
        />
      </Section>
    </div>
  );
}
