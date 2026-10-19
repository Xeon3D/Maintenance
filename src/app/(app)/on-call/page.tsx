import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/context";
import { onCallTeam, onCallUserAt } from "@/lib/on-call-db";
import { addDays, isMonth, isoWeek, localDay, monthWeeks, ON_CALL_ROLES, shiftMonth, weekDate, weekKey, weekOf } from "@/lib/on-call";
import { sp } from "@/lib/list";
import { cn } from "@/lib/utils";
import { titled } from "@/lib/metadata";
import { MemberToggle, WeekSelect } from "./client";

export const generateMetadata = titled("nav.onCall");

// One colour per team member (by name order), so the rota reads at a glance. Used as dots and stripes only.
const COLORS = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#65a30d"];

export default async function OnCallPage({ searchParams }: PageProps<"/on-call">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const canManage = ctx.can("onCall.manage");
  const tz = ctx.organization.timezone;

  const now = new Date();
  const today = localDay(now, tz);
  const thisWeek = weekOf(now, tz);
  const wanted = sp(await searchParams, "month");
  const month = wanted && isMonth(wanted) ? wanted : today.slice(0, 7);
  const weeks = monthWeeks(month);

  const [team, rows, currentId, staff] = await Promise.all([
    onCallTeam(ctx.db),
    ctx.db.onCallWeek.findMany({
      where: { weekStart: { gte: weekDate(weeks[0]), lte: weekDate(weeks[weeks.length - 1]) } },
      select: { weekStart: true, userId: true, user: { select: { name: true } } },
    }),
    onCallUserAt(ctx.db, tz, now),
    canManage
      ? ctx.db.membership.findMany({
          where: { active: true, role: { in: ON_CALL_ROLES } },
          select: { userId: true, onCall: true, role: true, user: { select: { name: true } }, jobRole: { select: { name: true } } },
          orderBy: { user: { name: "asc" } },
        })
      : [],
  ]);
  const people = team.map((m) => m.user);
  const color = new Map(people.map((p, i) => [p.id, COLORS[i % COLORS.length]]));
  const byWeek = new Map(rows.map((r) => [weekKey(r.weekStart), r]));
  const current = people.find((p) => p.id === currentId);

  const day = (d: string, opts: { weekday?: "short"; day?: "numeric"; month?: "short" | "long"; year?: "numeric" }) => format.dateTime(weekDate(d), { ...opts, timeZone: "UTC" });
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((i) => day(addDays(weeks[0], i), { weekday: "short" }));
  const monthHref = (m: string) => (m === today.slice(0, 7) ? "/on-call" : `/on-call?month=${m}`);

  return (
    <>
      <PageHeader title={t("nav.onCall")} description={t("onCall.description")} />

      <Card className="mb-6 flex items-center gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
          <PhoneCall className="size-4" />
        </span>
        <div className="min-w-0 text-sm">
          <div className="text-xs text-muted">{t("onCall.thisWeek", { from: day(thisWeek, { day: "numeric", month: "short" }), to: day(addDays(thisWeek, 6), { day: "numeric", month: "short" }) })}</div>
          {current ? (
            <div className="font-medium">
              {current.name}
              {current.id === ctx.user.id && <span className="ml-1.5 text-brand">({t("onCall.you")})</span>}
            </div>
          ) : (
            <div className="text-muted">{t("onCall.nobodyNow")}</div>
          )}
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <Link href={monthHref(shiftMonth(month, -1))} className="rounded-md p-1.5 hover:bg-gray-100" aria-label={t("common.previous")}>
              <ChevronLeft className="size-4" />
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="font-medium capitalize">{day(`${month}-01`, { month: "long", year: "numeric" })}</h2>
              {month !== today.slice(0, 7) && (
                <Link href="/on-call" className="text-xs text-brand hover:underline">
                  {t("onCall.today")}
                </Link>
              )}
            </div>
            <Link href={monthHref(shiftMonth(month, 1))} className="rounded-md p-1.5 hover:bg-gray-100" aria-label={t("common.next")}>
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="hidden grid-cols-[3rem_repeat(7,minmax(2.25rem,1fr))_minmax(9rem,13rem)] border-b border-border text-center text-xs font-medium uppercase text-muted sm:grid">
            <div className="py-2">{t("onCall.weekShort")}</div>
            {weekdays.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
            <div className="py-2 text-left">{t("onCall.onCall")}</div>
          </div>

          <ul>
            {weeks.map((w) => {
              const row = byWeek.get(w);
              const assigned = row?.userId ?? "";
              const inTeam = !assigned || color.has(assigned);
              const past = w < thisWeek;
              const range = `${day(w, { day: "numeric", month: "short" })} – ${day(addDays(w, 6), { day: "numeric", month: "short" })}`;
              const options = inTeam ? people : [...people, { id: assigned, name: t("onCall.leftTeam", { name: row!.user.name }) }];
              return (
                <li
                  key={w}
                  className={cn(
                    "grid grid-cols-[1fr_minmax(9rem,13rem)] items-center gap-2 border-b border-l-4 border-border px-3 py-2 last:border-b-0 sm:grid-cols-[3rem_repeat(7,minmax(2.25rem,1fr))_minmax(9rem,13rem)] sm:gap-0 sm:px-0 sm:py-0",
                    w === thisWeek && "bg-brand/5",
                    past && "opacity-70",
                  )}
                  style={{ borderLeftColor: assigned ? (color.get(assigned) ?? "var(--color-border)") : "transparent" }}
                >
                  <div className="text-sm sm:hidden">
                    <div className="font-medium">{range}</div>
                    <div className="text-xs text-muted">{t("onCall.weekNumber", { n: isoWeek(w) })}</div>
                  </div>
                  <div className="hidden text-center text-xs tabular-nums text-muted sm:block">{isoWeek(w)}</div>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    const d = addDays(w, i);
                    return (
                      <div key={d} className="hidden h-12 items-center justify-center text-sm sm:flex">
                        <span
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-full tabular-nums",
                            d === today ? "bg-brand text-brand-foreground" : d.slice(0, 7) !== month && "text-muted opacity-60",
                          )}
                        >
                          {Number(d.slice(8))}
                        </span>
                      </div>
                    );
                  })}
                  <div className="min-w-0 sm:pr-3">
                    {canManage ? (
                      <WeekSelect week={w} value={assigned} options={options} label={t("onCall.weekOf", { range })} />
                    ) : (
                      <span className={cn("flex items-center gap-1.5 truncate text-sm", !row && "text-muted")}>
                        {row && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.get(assigned) ?? "var(--color-muted)" }} />}
                        {row?.user.name ?? t("onCall.nobody")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium">{t("onCall.team")}</h2>
          <p className="mb-4 mt-1 text-xs text-muted">{t(canManage ? "onCall.teamHint" : "onCall.teamHintView")}</p>
          {canManage ? (
            <ul className="space-y-2">
              {staff.map((m) => (
                <li key={m.userId}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <MemberToggle userId={m.userId} checked={m.onCall} name={m.user.name} />
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.get(m.userId) ?? "transparent" }} />
                    <span className="min-w-0 flex-1 truncate">{m.user.name}</span>
                    <span className="text-xs text-muted">{m.jobRole?.name ?? t(`roles.${m.role}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : people.length === 0 ? (
            <p className="text-sm text-muted">{t("onCall.noTeam")}</p>
          ) : (
            <ul className="space-y-2">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.get(p.id) }} />
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
