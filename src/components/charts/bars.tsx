import Link from "next/link";
import { Legend } from "./legend";
import { cn } from "@/lib/utils";

// Horizontal bars in plain HTML: ≤ 24px thick (12px here), 4px rounded data end, square at the baseline,
// 2px surface gap between stacked segments, value at the tip. Categories are nominal, so one series
// gets one colour (slot 1) — never a value ramp. Every chart sits next to a table with the same numbers.

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const; // validated: light, on #ffffff

export type BarRow = { key: string; label: string; value: number; display: string; href?: string; sub?: string };

export function BarList({ rows, color = SERIES[0], empty }: { rows: BarRow[]; color?: string; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (rows.length === 0 || max === 0) return <p className="py-4 text-sm text-muted">{empty ?? "—"}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const label = (
          <span className="block truncate text-sm">
            {r.label}
            {r.sub && <span className="ml-1.5 text-xs text-muted">{r.sub}</span>}
          </span>
        );
        return (
          <li key={r.key} className="group grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
            {r.href ? (
              <Link href={r.href} className="min-w-0 hover:text-brand">
                {label}
              </Link>
            ) : (
              label
            )}
            <div className="flex items-center gap-2" title={`${r.label}: ${r.display}`}>
              <div
                className="h-3 rounded-r transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max(0.5, (r.value / max) * 85)}%`, backgroundColor: color }}
              />
              <span className="shrink-0 text-xs tabular-nums text-foreground">{r.display}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type StackRow = { key: string; label: string; values: number[]; displays: string[]; total: string; totalValue: number; href?: string };

/** Part-to-whole per row (e.g. labour / parts / other cost per villa), with a legend and per-segment hover. */
export function StackedBars({ rows, series, empty }: { rows: StackRow[]; series: string[]; empty?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.totalValue));
  if (rows.length === 0 || max === 0) return <p className="py-4 text-sm text-muted">{empty ?? "—"}</p>;
  return (
    <div>
      <Legend items={series.map((name, i) => ({ name, color: SERIES[i] }))} className="mb-3" />
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const parts = r.values.map((v, i) => ({ v, i })).filter((p) => p.v > 0);
          return (
            <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
              {r.href ? (
                <Link href={r.href} className="truncate text-sm hover:text-brand">
                  {r.label}
                </Link>
              ) : (
                <span className="truncate text-sm">{r.label}</span>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-3 gap-[2px]" style={{ width: `${Math.max(0.5, (r.totalValue / max) * 85)}%` }}>
                  {parts.map((p, j) => (
                    <div
                      key={p.i}
                      tabIndex={0}
                      className={cn("group relative h-full outline-none hover:opacity-80 focus-visible:opacity-80", j === parts.length - 1 && "rounded-r")}
                      style={{ flexGrow: p.v, flexBasis: 0, backgroundColor: SERIES[p.i] }}
                      aria-label={`${r.label} · ${series[p.i]}: ${r.displays[p.i]}`}
                    >
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md group-hover:block group-focus-visible:block">
                        <span className="font-semibold tabular-nums">{r.displays[p.i]}</span> <span className="text-muted">{series[p.i]}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <span className="shrink-0 text-xs tabular-nums">{r.total}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
