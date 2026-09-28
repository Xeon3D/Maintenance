import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { Sparkline } from "@/components/sparkline";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { isOutOfRange } from "@/lib/meters";
import { ReadingInput } from "./reading-input";

export const metadata = { title: "Meters" };

export default async function MetersPage({ searchParams }: PageProps<"/meters">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const q = sp(params, "q");

  const [meters, villas] = await Promise.all([
    ctx.db.meter.findMany({
      where: {
        ...(sp(params, "villaId") ? { asset: { villaId: sp(params, "villaId") } } : {}),
        ...(q
          ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { asset: { name: { contains: q, mode: "insensitive" } } }] }
          : {}),
      },
      include: {
        asset: { select: { id: true, name: true, villa: { select: { name: true } } } },
        readings: { orderBy: { createdAt: "desc" }, take: 20, select: { value: true } },
      },
      orderBy: [{ asset: { villa: { name: "asc" } } }, { asset: { name: "asc" } }, { name: "asc" }],
    }),
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const onlyAlerts = sp(params, "alerts") === "1";
  const rows = onlyAlerts ? meters.filter((m) => m.lastValue !== null && isOutOfRange(m, m.lastValue)) : meters;
  const canRead = ctx.can("workOrders.execute");

  return (
    <>
      <PageHeader title={t("nav.meters")} description={t("meters.description")} />
      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="villaId" defaultValue={sp(params, "villaId") ?? ""}>
          <option value="">{t("assets.allVillas")}</option>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select name="alerts" defaultValue={onlyAlerts ? "1" : ""}>
          <option value="">{t("meters.allMeters")}</option>
          <option value="1">{t("meters.outOfRangeOnly")}</option>
        </Select>
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState title={meters.length ? t("common.noResults") : t("meters.empty")} description={meters.length ? undefined : t("meters.emptyHint")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th className="hidden md:table-cell">{t("meters.trend")}</th>
                <th className="text-right">{t("meters.lastReading")}</th>
                {canRead && <th>{t("meters.record")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const out = m.lastValue !== null && isOutOfRange(m, m.lastValue);
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-1.5 font-medium">
                        {m.name}
                        {out && <AlertTriangle className="size-4 text-danger" />}
                      </div>
                      <Link href={`/assets/${m.asset.id}`} className="text-xs text-muted hover:text-brand">
                        {m.asset.villa.name} · {m.asset.name}
                      </Link>
                    </td>
                    <td className="hidden md:table-cell">
                      <Sparkline values={m.readings.map((r) => r.value).reverse()} lower={m.lowerLimit} upper={m.upperLimit} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className={out ? "font-semibold text-danger" : "font-semibold"}>{m.lastValue !== null ? format.number(m.lastValue) : "—"}</span>{" "}
                      <span className="text-xs text-muted">{m.unit}</span>
                      {m.lastReadAt && <div className="text-xs text-muted">{format.relativeTime(m.lastReadAt)}</div>}
                    </td>
                    {canRead && (
                      <td>
                        <ReadingInput meterId={m.id} unit={m.unit} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
