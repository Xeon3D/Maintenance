// CSV for spreadsheet exports. UTF-8 with BOM so Excel shows accents; values that a spreadsheet would
// run as a formula (=, +, -, @, tab, CR at the start) are prefixed with ' (CSV injection).

export type Cell = string | number | null | undefined;

function cell(v: Cell) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** A header; `money(label)` marks a column of labour, parts, totals or fees, which needs "See costs" (costs.view). */
export type Column = string | { money: string };
export const money = (label: string): Column => ({ money: label });

/** Header labels and rows, with the money columns dropped unless `showMoney`. */
export function moneyColumns(header: Column[], rows: Cell[][], showMoney: boolean) {
  const keep = header.flatMap((h, i) => (showMoney || typeof h === "string" ? [i] : []));
  return {
    header: keep.map((i) => { const h = header[i]; return typeof h === "string" ? h : h.money; }),
    rows: rows.map((r) => keep.map((i) => r[i])),
  };
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
