"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Legend } from "./legend";

export type TrendSeries = { name: string; color: string; values: number[] };

const M = { top: 10, right: 14, bottom: 26, left: 38 };

/** Round the axis max up to 1/2/5 × 10^n and give ~4 ticks. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/**
 * Multi-series line chart over time: 2px lines, end dots with a surface ring, hairline grid,
 * one crosshair that snaps to the nearest bucket and lists every series (mouse and keyboard).
 */
export function TrendChart({ labels, series, height = 220, ariaLabel }: { labels: string[]; series: TrendSeries[]; height?: number; ariaLabel: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)));
  const yMax = ticks.at(-1)!;
  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const x = (i: number) => M.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH;
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 90))));

  const pick = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect();
    const px = clientX - rect.left - M.left;
    setHover(Math.min(n - 1, Math.max(0, Math.round(n <= 1 ? 0 : (px / plotW) * (n - 1)))));
  };

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) + 10, 0), width - 170);

  return (
    <div>
      {series.length > 1 && <Legend items={series.map((s) => ({ name: s.name, color: s.color, shape: "line" }))} className="mb-2" />}
      <div ref={box} className="relative select-none">
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          <title id={titleId}>{ariaLabel}</title>
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={M.left} x2={width - M.right} y1={y(tk)} y2={y(tk)} style={{ stroke: tk === 0 ? "var(--color-gray-300, #c3c2b7)" : "var(--border)" }} strokeWidth={1} />
              <text x={M.left - 8} y={y(tk)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {tk}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            // Evenly spaced labels, plus the last one; drop a regular label that would crowd it.
            i === n - 1 || (i % every === 0 && n - 1 - i >= every) ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-muted text-[11px]">
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} style={{ stroke: "var(--muted)" }} strokeWidth={1} />}
          {series.map((s) => (
            <g key={s.name}>
              <path
                d={s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {(hover !== null ? [hover] : [n - 1]).map((i) => (
                <circle key={i} cx={x(i)} cy={y(s.values[i] ?? 0)} r={4} fill={s.color} style={{ stroke: "var(--surface)" }} strokeWidth={2} />
              ))}
            </g>
          ))}
          {/* Whole plot is the hit target; the crosshair finds the X. */}
          <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="transparent" />
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-2 z-10 w-40 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md" style={{ left: tipLeft }}>
            <div className="mb-1 text-muted">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="h-0.5 w-3 rounded" style={{ backgroundColor: s.color }} />
                <span className="font-semibold tabular-nums">{s.values[hover]}</span>
                <span className="truncate text-muted">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
