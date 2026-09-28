import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { SystemBadge, PriorityText } from "@/components/badges";
import { RecentWorkOrders } from "@/components/recent-work-orders";
import { getContext } from "@/lib/context";
import { recurrenceOf } from "@/lib/pm";
import { occurrencesBetween } from "@/lib/pm-schedule";
import { describeSchedule } from "../describe";
import { PMControls } from "./controls";

export default async function PMPage({ params }: PageProps<"/preventive/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();

  const s = await ctx.db.pMSchedule.findUnique({
    where: { id },
    include: {
      villa: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true } },
      procedure: { select: { id: true, name: true, _count: { select: { items: true } } } },
      team: { select: { name: true } },
      meter: { select: { name: true, unit: true, lastValue: true } },
      assignees: { select: { user: { select: { name: true } } } },
      workOrders: { select: { status: true, dueDate: true, completedAt: true } },
    },
  });
  if (!s) notFound();

  const weekday = (d: number) => format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), { weekday: "short", timeZone: "UTC" });
  const dt = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  const r = recurrenceOf(s, ctx.organization.timezone);
  const upcoming =
    s.active && r && s.nextDueAt ? occurrencesBetween(r, s.nextDueAt, new Date(s.nextDueAt.getTime() + 2 * 366 * 86_400_000), 6) : [];
  const done = s.workOrders.filter((w) => w.status === "DONE");
  const onTime = done.filter((w) => w.completedAt && w.dueDate && w.completedAt <= w.dueDate).length;

  const details: [string, React.ReactNode][] = [
    [t("pm.frequencyLabel"), describeSchedule(s, t as never, weekday, s.meter?.unit)],
    [t("pm.meter"), s.meter && `${s.meter.name}${s.meter.lastValue != null ? ` · ${format.number(s.meter.lastValue)} ${s.meter.unit}` : ""}`],
    [t("pm.startDate"), s.startDate && dt(s.startDate)],
    [t("pm.endDate"), s.endDate && dt(s.endDate)],
    [t("pm.leadDays"), s.leadDays > 0 && t("pm.leadDaysValue", { count: s.leadDays })],
    [t("pm.procedure"), s.procedure && <Link href={`/procedures/${s.procedure.id}`} className="hover:text-brand">{s.procedure.name} ({s.procedure._count.items})</Link>],
    [t("assets.villa"), s.villa && <Link href={`/villas/${s.villa.id}`} className="hover:text-brand">{s.villa.name}</Link>],
    [t("wo.asset"), s.asset && <Link href={`/assets/${s.asset.id}`} className="hover:text-brand">{s.asset.name}</Link>],
    [t("wo.priority"), <PriorityText key="p" priority={s.priority} />],
    [t("wo.team"), s.team?.name],
    [t("wo.assignees"), s.assignees.map((a) => a.user.name).join(", ")],
    [t("wo.estimatedHours"), s.estimatedMinutes != null && `${+(s.estimatedMinutes / 60).toFixed(2)} h`],
    [t("pm.lastGenerated"), s.lastGeneratedAt && dt(s.lastGeneratedAt)],
  ];

  return (
    <>
      <BackLink href="/preventive" label={t("nav.preventive")} />
      <PageHeader
        title={s.title}
        actions={
          ctx.can("pm.manage") && (
            <>
              <PMControls id={s.id} active={s.active} />
              <Link href={`/preventive/${s.id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="size-4" />
                  {t("common.edit")}
                </Button>
              </Link>
            </>
          )
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        {s.system && <SystemBadge system={s.system} />}
        {!s.active && <Badge>{t("pm.paused")}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {s.description && (
            <Card className="p-5">
              <p className="whitespace-pre-wrap text-sm">{s.description}</p>
            </Card>
          )}
          <RecentWorkOrders
            ctx={ctx}
            title={t("pm.generatedWorkOrders")}
            where={{ pmScheduleId: s.id }}
            orderBy={{ dueDate: "desc" }}
            take={12}
            newHref="/work-orders/new"
            viewAllHref="/work-orders?status=all"
          />
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <div className="text-xs text-muted">{t("pm.nextDue")}</div>
            <div className="mt-1 text-lg font-semibold">
              {s.trigger === "METER"
                ? s.meter?.lastValue != null && s.lastMeterValue != null && s.meterInterval
                  ? t("pm.meterRemaining", { value: format.number(Math.max(0, s.lastMeterValue + s.meterInterval - s.meter.lastValue)), unit: s.meter.unit })
                  : t("pm.waitingReading")
                : s.nextDueAt
                  ? dt(s.nextDueAt)
                  : t("pm.ended")}
            </div>
            {upcoming.length > 1 && (
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {upcoming.slice(1).map((d) => (
                  <li key={d.toISOString()}>{format.dateTime(d, { dateStyle: "medium" })}</li>
                ))}
              </ul>
            )}
            {done.length > 0 && (
              <p className="mt-3 border-t border-border pt-3 text-sm">
                {t("pm.onTimeRatio", { onTime, total: done.length })}
              </p>
            )}
          </Card>
          <Card className="p-5">
            <dl className="space-y-2.5 text-sm">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
