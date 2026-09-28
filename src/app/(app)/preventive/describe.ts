import type { PMSchedule } from "@/generated/prisma/client";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Human summary such as "Every 3 months" / "Every 500 h" / "Weekly on Mon, Thu". */
export function describeSchedule(
  s: Pick<PMSchedule, "trigger" | "frequency" | "interval" | "daysOfWeek" | "meterInterval">,
  t: T,
  weekday: (d: number) => string,
  meterUnit?: string | null,
) {
  if (s.trigger === "METER") return t("pm.everyMeter", { value: s.meterInterval ?? 0, unit: meterUnit ?? "" });
  if (!s.frequency) return "—";
  const base = t(`pm.every.${s.frequency}`, { count: s.interval });
  return s.frequency === "WEEKLY" && s.daysOfWeek.length
    ? `${base} · ${[...s.daysOfWeek].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(weekday).join(", ")}`
    : base;
}
