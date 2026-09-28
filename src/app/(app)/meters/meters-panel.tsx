import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, CalendarClock, Gauge } from "lucide-react";
import { Card } from "@/components/ui";
import { Sparkline } from "@/components/sparkline";
import type { AppContext } from "@/lib/context";
import { isOutOfRange } from "@/lib/meters";
import { MeterFormToggle } from "./meter-form";
import { ReadingInput } from "./reading-input";

const HISTORY = 20;

/** Meters card for an asset page: values, trend, limits, record reading, add/edit. */
export async function MetersPanel({ ctx, assetId }: { ctx: AppContext; assetId: string }) {
  const t = await getTranslations();
  const format = await getFormatter();
  const meters = await ctx.db.meter.findMany({
    where: { assetId },
    include: { readings: { orderBy: { createdAt: "desc" }, take: HISTORY, select: { value: true } } },
    orderBy: { name: "asc" },
  });
  const canManage = ctx.can("assets.manage");
  const canRead = ctx.can("workOrders.execute");

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-medium">
          <Gauge className="size-4 text-muted" />
          {t("nav.meters")}
        </h2>
      </div>
      {meters.length === 0 && <p className="px-5 py-4 text-sm text-muted">{t("meters.emptyAsset")}</p>}
      <ul className="divide-y divide-border">
        {meters.map((m) => {
          const out = m.lastValue !== null && isOutOfRange(m, m.lastValue);
          return (
            <li key={m.id} className="px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {out && <AlertTriangle className="size-4 text-danger" />}
                  </div>
                  <div className="text-xs text-muted">
                    {[
                      m.lowerLimit !== null ? `≥ ${format.number(m.lowerLimit)}` : null,
                      m.upperLimit !== null ? `≤ ${format.number(m.upperLimit)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("meters.noLimits")}
                    {m.lastReadAt && ` · ${format.relativeTime(m.lastReadAt)}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkline values={m.readings.map((r) => r.value).reverse()} lower={m.lowerLimit} upper={m.upperLimit} />
                  <div className={out ? "text-lg font-semibold tabular-nums text-danger" : "text-lg font-semibold tabular-nums"}>
                    {m.lastValue !== null ? format.number(m.lastValue) : "—"}
                    <span className="ml-1 text-xs font-normal text-muted">{m.unit}</span>
                  </div>
                  {canManage && <MeterFormToggle assetId={assetId} meter={m} />}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {canRead && <ReadingInput meterId={m.id} unit={m.unit} />}
                {ctx.can("pm.manage") && (
                  <Link href={`/preventive/new?meterId=${m.id}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand">
                    <CalendarClock className="size-3.5" />
                    {t("meters.scheduleByMeter")}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {canManage && (
        <div className="border-t border-border px-5 py-3">
          <MeterFormToggle assetId={assetId} />
        </div>
      )}
    </Card>
  );
}
