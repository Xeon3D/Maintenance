import { Table } from "@/components/ui";
import { BarList } from "@/components/charts/bars";
import { technicianReport, STANDARD_HOURS_PER_DAY } from "@/lib/reports";
import { ExportLink, loadReport, Section } from "../common";

export default async function TechnicianReportPage({ searchParams }: PageProps<"/reports/technicians">) {
  const { ctx, f, t, money, pct, num, day } = await loadReport(searchParams);
  const r = await technicianReport(ctx, f);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {t("reports.techNote", { from: day(f.from), to: day(f.to), hours: num(r.availableHours, 0), perDay: STANDARD_HOURS_PER_DAY })}
        </p>
        <ExportLink kind="technicians" f={f} label={t("reports.exportCsv")} />
      </div>
      <Section title={t("reports.hoursLogged")}>
        <BarList rows={r.people.map((p) => ({ key: p.id, label: p.name, value: p.hours, display: t("reports.hours", { n: num(p.hours) }) }))} empty={t("reports.noTime")} />
      </Section>
      {r.people.length > 0 && (
        <Section title={t("reports.techTable")}>
          <Table>
            <thead>
              <tr>
                <th>{t("reports.person")}</th>
                <th className="text-right">{t("reports.hoursCol")}</th>
                <th className="text-right">{t("reports.utilisation")}</th>
                <th className="text-right">{t("reports.jobsWorked")}</th>
                <th className="text-right">{t("reports.jobsCompleted")}</th>
                <th className="text-right">{t("costs.labor")}</th>
              </tr>
            </thead>
            <tbody>
              {r.people.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-right tabular-nums">{num(p.hours)}</td>
                  <td className="text-right tabular-nums">{pct(p.utilisation)}</td>
                  <td className="text-right tabular-nums">{p.jobs}</td>
                  <td className="text-right tabular-nums">{p.completed}</td>
                  <td className="text-right tabular-nums">{money(p.labor)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}
    </div>
  );
}
