import { SystemType } from "@/generated/prisma/enums";

// Report filters live in the URL so every tab, chart, table and CSV export shares one slice.

export const PRESETS = ["30d", "90d", "12m", "ytd", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export type ReportFilters = {
  preset: Preset;
  from: Date;
  to: Date;
  clientId: string | null;
  villaId: string | null;
  system: SystemType | null;
};

type SP = Record<string, string | string[] | undefined>;
const one = (p: SP, k: string) => (typeof p[k] === "string" && p[k] ? (p[k] as string) : null);
const DAY = 86_400_000;

function day(s: string | null) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

export function parseReportFilters(params: SP, now = new Date()): ReportFilters {
  const preset = (PRESETS as readonly string[]).includes(one(params, "range") ?? "") ? (one(params, "range") as Preset) : "90d";
  const endToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  let from: Date;
  let to = endToday;
  switch (preset) {
    case "30d":
      from = new Date(endToday.getTime() + 1 - 30 * DAY);
      break;
    case "12m":
      from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate() + 1));
      break;
    case "ytd":
      from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      break;
    case "custom": {
      const f = day(one(params, "from"));
      const t = day(one(params, "to"));
      from = f ?? new Date(endToday.getTime() + 1 - 90 * DAY);
      to = t ? new Date(t.getTime() + DAY - 1) : endToday;
      if (to < from) [from, to] = [new Date(to.getTime() + 1 - DAY), new Date(from.getTime() + DAY - 1)];
      // Keep reports bounded: at most three years.
      if (to.getTime() - from.getTime() > 3 * 366 * DAY) from = new Date(to.getTime() + 1 - 3 * 366 * DAY);
      break;
    }
    default:
      from = new Date(endToday.getTime() + 1 - 90 * DAY);
  }
  const system = one(params, "system");
  return {
    preset,
    from,
    to,
    clientId: one(params, "clientId"),
    villaId: one(params, "villaId"),
    system: system && (Object.values(SystemType) as string[]).includes(system) ? (system as SystemType) : null,
  };
}

/** The filters as a query string (for tab links and CSV exports). */
export function filterQuery(f: ReportFilters) {
  const q = new URLSearchParams({ range: f.preset });
  if (f.preset === "custom") {
    q.set("from", f.from.toISOString().slice(0, 10));
    q.set("to", f.to.toISOString().slice(0, 10));
  }
  if (f.clientId) q.set("clientId", f.clientId);
  if (f.villaId) q.set("villaId", f.villaId);
  if (f.system) q.set("system", f.system);
  return q.toString();
}
