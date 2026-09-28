import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { Card } from "@/components/ui";
import { getContext } from "@/lib/context";
import { filterQuery, parseReportFilters, type ReportFilters } from "@/lib/report-filters";
import type { Grain } from "@/lib/report-math";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Context, filters and formatters every report page needs. */
export async function loadReport(searchParams: SP) {
  const ctx = await getContext();
  if (!ctx.can("reports.view")) notFound();
  const f = parseReportFilters(await searchParams);
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency, maximumFractionDigits: 0 });
  const pct = (p: number | null) => (p === null ? "—" : format.number(p, { style: "percent" }));
  const num = (n: number, digits = 1) => format.number(n, { maximumFractionDigits: digits });
  /** Hours as minutes, hours or days, whichever reads best. */
  const duration = (h: number | null) =>
    h === null ? "—" : h < 1 ? t("reports.minutes", { n: num(h * 60, 0) }) : h < 48 ? t("reports.hours", { n: num(h) }) : t("reports.days", { n: num(h / 24) });
  const day = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeZone: "UTC" });
  const bucketLabel = (d: Date, grain: Grain) =>
    format.dateTime(d, grain === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  return { ctx, f, t, format, money, pct, num, duration, day, bucketLabel };
}

export function ExportLink({ kind, f, label }: { kind: string; f: ReportFilters; label: string }) {
  return (
    <a
      href={`/reports/export/${kind}?${filterQuery(f)}`}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-gray-50"
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}

/** Section card with a title, an optional explanation and actions. */
export function Section({ title, note, actions, children, className }: { title: string; note?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-5 py-3">
        <div>
          <h2 className="font-medium">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
