import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Gauge, Plus } from "lucide-react";
import { Badge, Button, Card, PageHeader, Select, Table } from "@/components/ui";
import { FilterBar } from "@/components/list-controls";
import { EmptyState } from "@/components/empty-state";
import { SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { searchWhere, sp } from "@/lib/list";
import { cn } from "@/lib/utils";
import { SystemType } from "@/generated/prisma/enums";
import { describeSchedule } from "./describe";
import { RunSchedulerButton } from "./run-button";

export const metadata = { title: "Preventive maintenance" };

const COMPLIANCE_DAYS = 90;

export default async function PreventivePage({ searchParams }: PageProps<"/preventive">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const params = await searchParams;
  const system = sp(params, "system");
  const state = sp(params, "state") ?? "active";
  const now = new Date();

  const [schedules, villas, dueInPeriod] = await Promise.all([
    ctx.db.pMSchedule.findMany({
      where: {
        ...(state === "active" ? { active: true } : state === "paused" ? { active: false } : {}),
        ...(sp(params, "villaId") ? { villaId: sp(params, "villaId") } : {}),
        ...(system && system in SystemType ? { system: system as SystemType } : {}),
        ...searchWhere(sp(params, "q"), ["title", "description"]),
      },
      include: {
        villa: { select: { name: true } },
        asset: { select: { name: true } },
        meter: { select: { unit: true, lastValue: true } },
        _count: { select: { workOrders: true } },
      },
      orderBy: [{ active: "desc" }, { nextDueAt: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    }),
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // PM compliance: preventive WOs due in the last 90 days, and how many were done on time.
    ctx.db.workOrder.findMany({
      where: { type: "PREVENTIVE", status: { not: "CANCELLED" }, dueDate: { gte: new Date(now.getTime() - COMPLIANCE_DAYS * 86_400_000), lte: now } },
      select: { status: true, dueDate: true, completedAt: true },
    }),
  ]);

  const onTime = dueInPeriod.filter((w) => w.completedAt && w.dueDate && w.completedAt <= w.dueDate).length;
  const late = dueInPeriod.filter((w) => w.status === "DONE").length - onTime;
  const compliance = dueInPeriod.length ? Math.round((onTime / dueInPeriod.length) * 100) : null;
  const weekday = (d: number) => format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), { weekday: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title={t("nav.preventive")}
        description={t("pm.description")}
        actions={
          ctx.can("pm.manage") && (
            <>
              <RunSchedulerButton />
              <Link href="/preventive/new">
                <Button>
                  <Plus className="size-4" />
                  {t("pm.new")}
                </Button>
              </Link>
            </>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-muted">{t("pm.compliance", { days: COMPLIANCE_DAYS })}</div>
          <div className={cn("mt-1 text-2xl font-semibold tabular-nums", compliance !== null && compliance < 80 && "text-danger")}>
            {compliance === null ? "—" : `${compliance}%`}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted">{t("pm.doneOnTime")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{onTime}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted">{t("pm.doneLate")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{late}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted">{t("pm.missed")}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{dueInPeriod.length - onTime - late}</div>
        </Card>
      </div>

      <FilterBar searchPlaceholder={t("common.search")}>
        <Select name="state" defaultValue={state}>
          <option value="active">{t("pm.stateActive")}</option>
          <option value="paused">{t("pm.statePaused")}</option>
          <option value="all">{t("pm.stateAll")}</option>
        </Select>
        <Select name="villaId" defaultValue={sp(params, "villaId") ?? ""}>
          <option value="">{t("assets.allVillas")}</option>
          {villas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Select name="system" defaultValue={system ?? ""}>
          <option value="">{t("assets.allSystems")}</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {schedules.length === 0 ? (
        <EmptyState title={t("pm.empty")} description={t("pm.emptyHint")} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>{t("wo.title")}</th>
                <th>{t("pm.frequencyLabel")}</th>
                <th className="hidden md:table-cell">{t("assets.location")}</th>
                <th>{t("pm.nextDue")}</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className={cn("hover:bg-gray-50", !s.active && "opacity-60")}>
                  <td>
                    <Link href={`/preventive/${s.id}`} className="font-medium hover:text-brand">
                      {s.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {s.system && <SystemBadge system={s.system} />}
                      {!s.active && <Badge>{t("pm.paused")}</Badge>}
                      <span className="text-xs text-muted">{t("pm.generatedCount", { count: s._count.workOrders })}</span>
                    </div>
                  </td>
                  <td className="text-muted">
                    {s.trigger === "METER" && <Gauge className="mr-1 inline size-3.5" />}
                    {describeSchedule(s, t as never, weekday, s.meter?.unit)}
                  </td>
                  <td className="hidden md:table-cell">
                    {s.villa?.name ?? "—"}
                    {s.asset && <div className="text-xs text-muted">{s.asset.name}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    {s.trigger === "METER" ? (
                      <span className="text-xs text-muted">
                        {s.meter?.lastValue != null && s.lastMeterValue != null && s.meterInterval
                          ? t("pm.meterRemaining", { value: format.number(Math.max(0, s.lastMeterValue + s.meterInterval - s.meter.lastValue)), unit: s.meter.unit })
                          : "—"}
                      </span>
                    ) : s.nextDueAt ? (
                      format.dateTime(s.nextDueAt, { dateStyle: "medium" })
                    ) : (
                      <span className="text-muted">{t("pm.ended")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
