"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownToLine, ArrowUpFromLine, ListPlus, ScanLine, X } from "lucide-react";
import { Scanner } from "@/components/scanner";
import { Button, Field, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { restockVanAction, type RestockResult } from "../actions";

export type VanPart = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  inVan: number;
  vanMin: number | null;
  stock: Record<string, number>; // per warehouse id
};

type Line = { partId: string; quantity: string };

/** Load the van from a warehouse, or take parts back: several lines at once, by list, "what's short" or camera. */
export function VanRestock({ vanId, warehouses, parts }: { vanId: string; warehouses: { id: string; name: string }[]; parts: VanPart[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState<RestockResult, FormData>(restockVanAction, undefined);
  const [direction, setDirection] = useState<"load" | "unload">("load");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [scanning, setScanning] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  // Lines are cleared once they moved; after an error they stay so the quantity can be fixed.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setLines([]);
  }

  /** What the source location holds of a part. */
  const available = (p: VanPart) => (direction === "load" ? (p.stock[warehouseId] ?? 0) : p.inVan);
  const add = (partId: string, quantity = "1") =>
    setLines((ls) => (ls.some((l) => l.partId === partId) ? ls : [...ls, { partId, quantity }]));

  const fillShort = () => {
    for (const p of parts) {
      if (p.vanMin === null || p.inVan >= p.vanMin) continue;
      const q = Math.min(p.vanMin - p.inVan, p.stock[warehouseId] ?? 0);
      if (q > 0) add(p.id, String(q));
    }
  };
  const onScan = (code: string) => {
    setScanning(false);
    const c = code.trim().toLowerCase();
    const hit = parts.find((p) => p.barcode?.toLowerCase() === c || p.sku?.toLowerCase() === c);
    setNotFound(hit ? null : code);
    if (hit) add(hit.id);
  };
  const choices = parts.filter((p) => !lines.some((l) => l.partId === p.id) && (direction === "unload" ? p.inVan > 0 : (p.stock[warehouseId] ?? 0) > 0));
  const payload = JSON.stringify(lines.map((l) => ({ partId: l.partId, quantity: Number(l.quantity.replace(",", ".")) })));
  const shortCount = parts.filter((p) => p.vanMin !== null && p.inVan < p.vanMin && (p.stock[warehouseId] ?? 0) > 0).length;

  return (
    <form action={action} className="space-y-4">
      {scanning && <Scanner onResult={onScan} onClose={() => setScanning(false)} />}
      <input type="hidden" name="vanId" value={vanId} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="lines" value={payload} />

      <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label={t("van.direction")}>
        {(["load", "unload"] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={direction === d}
            onClick={() => {
              setDirection(d);
              setLines([]);
            }}
            className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-sm", direction === d ? "bg-brand text-white" : "text-muted hover:text-foreground")}
          >
            {d === "load" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
            {t(`van.${d}`)}
          </button>
        ))}
      </div>

      <Field label={direction === "load" ? t("van.fromWarehouse") : t("van.toWarehouse")}>
        <Select name="warehouseId" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Select
          value=""
          onChange={(e) => e.target.value && add(e.target.value)}
          aria-label={t("van.addPart")}
          className="w-auto min-w-56 flex-1"
        >
          <option value="">{choices.length ? t("van.addPart") : t("van.nothingToAdd")}</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.sku ? ` (${p.sku})` : ""} — {available(p)} {p.unit}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={() => setScanning(true)}>
          <ScanLine className="size-4" />
          {t("scan.scanPart")}
        </Button>
        {direction === "load" && (
          <Button type="button" variant="secondary" onClick={fillShort} disabled={shortCount === 0}>
            <ListPlus className="size-4" />
            {t("van.fillShort", { count: shortCount })}
          </Button>
        )}
      </div>
      {notFound && <p className="text-xs text-danger">{t("scan.partNotFound", { code: notFound })}</p>}

      {lines.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {lines.map((l, i) => {
            const p = byId.get(l.partId)!;
            const max = available(p);
            const over = Number(l.quantity.replace(",", ".")) > max;
            return (
              <li key={l.partId} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{p.name}</span>
                  <span className={cn("block text-xs", over ? "text-danger" : "text-muted")}>{t("van.available", { qty: max, unit: p.unit })}</span>
                </span>
                <Input
                  value={l.quantity}
                  inputMode="decimal"
                  aria-label={t("van.quantity")}
                  aria-invalid={over || undefined}
                  className="w-24 text-right tabular-nums"
                  onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                />
                <span className="w-10 text-xs text-muted">{p.unit}</span>
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label={t("common.remove")}>
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Field label={t("van.note")}>
        <Input name="note" maxLength={500} placeholder={t("van.notePlaceholder")} />
      </Field>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {t(state.error as never)}
          {state.detail ? ` (${state.detail})` : ""}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {t("van.done", { count: state.moved ?? 0 })}
        </p>
      )}
      <Button type="submit" disabled={pending || lines.length === 0 || !warehouseId}>
        {direction === "load" ? t("van.submitLoad", { count: lines.length }) : t("van.submitUnload", { count: lines.length })}
      </Button>
    </form>
  );
}
