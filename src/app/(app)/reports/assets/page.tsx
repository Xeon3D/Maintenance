import Link from "next/link";
import { Table } from "@/components/ui";
import { BarList } from "@/components/charts/bars";
import { StatTile } from "@/components/charts/stat-tile";
import { AssetStatusBadge, SystemBadge } from "@/components/badges";
import { assetReport } from "@/lib/reports";
import { ExportLink, loadReport, Section } from "../common";

const TOP = 25;

export default async function AssetReportPage({ searchParams }: PageProps<"/reports/assets">) {
  const { ctx, f, t, pct, duration, day, format } = await loadReport(searchParams);
  const a = await assetReport(ctx, f);
  const affected = a.rows.filter((r) => r.downHours > 0 || r.failures > 0);
  const withDowntime = a.rows.filter((r) => r.downHours > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("reports.assetNote", { from: day(f.from), to: day(f.to) })}</p>
        <ExportLink kind="assets" f={f} label={t("reports.exportCsv")} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label={t("reports.fleetAvailability")} value={pct(a.fleetAvailability)} sub={t("reports.assetCount", { count: a.rows.length })} />
        <StatTile label={t("reports.assetsWithDowntime")} value={format.number(withDowntime.length)} alert={withDowntime.length > 0} />
        <StatTile label={t("reports.repairsOpened")} value={format.number(a.rows.reduce((s, r) => s + r.failures, 0))} />
      </div>

      <Section title={t("reports.downtimeTitle")} note={t("reports.downtimeNote")}>
        <BarList
          rows={withDowntime.slice(0, 10).map((r) => ({ key: r.id, label: r.name, sub: r.villa, value: r.downHours, display: duration(r.downHours), href: `/assets/${r.id}` }))}
          empty={t("reports.noDowntime")}
        />
      </Section>

      <Section title={t("reports.assetTable")} note={affected.length > TOP ? t("reports.topN", { n: TOP }) : undefined}>
        {affected.length === 0 ? (
          <p className="text-sm text-muted">{t("reports.noAssetIssues")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t("wo.asset")}</th>
                <th>{t("assets.system")}</th>
                <th className="text-right">{t("reports.down")}</th>
                <th className="text-right">{t("reports.degraded")}</th>
                <th className="text-right">{t("reports.availability")}</th>
                <th className="text-right">{t("reports.repairs")}</th>
              </tr>
            </thead>
            <tbody>
              {affected.slice(0, TOP).map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/assets/${r.id}`} className="font-medium hover:text-brand">
                      {r.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {r.villa} <AssetStatusBadge status={r.status} />
                    </div>
                  </td>
                  <td>
                    <SystemBadge system={r.system} />
                  </td>
                  <td className="text-right tabular-nums">{r.downHours ? duration(r.downHours) : "—"}</td>
                  <td className="text-right tabular-nums">{r.degradedHours ? duration(r.degradedHours) : "—"}</td>
                  <td className="text-right tabular-nums">{pct(r.availability)}</td>
                  <td className="text-right tabular-nums">{r.failures}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}
