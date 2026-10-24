import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";
import { Card } from "@/components/ui";
import { WeekPeople } from "@/app/(app)/settings/users/on-call/client";
import type { AppContext } from "@/lib/context";
import { onCallTeam, onCallUsersAt } from "@/lib/on-call-db";
import { addDays, isMonth, isoWeek, localDay, monthWeeks, shiftMonth, weekDate, weekKey, weekOf } from "@/lib/on-call";
import { cn } from "@/lib/utils";

// The on-call rota, shared by the read-only page in the sidebar (/on-call) and the one managed from Settings → Staff.

// One colour per team member (by name order), so the rota reads at a glance. Used as dots and stripes only.
const COLORS = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#65a30d"];

/** The team (by name) and each member's colour. */
export async function onCallPeople(ctx: AppContext) {
  const people = (await onCallTeam(ctx.db)).map((m) => m.user);
  return { people, color: new Map(people.map((p, i) => [p.id, COLORS[i % COLORS.length]])) };
}

const dayFormat = async () => {
  const format = await getFormatter();
  return (d: string, opts: { weekday?: "short"; day?: "numeric"; month?: "short" | "long"; year?: "numeric" }) =>
    format.dateTime(weekDate(d), { ...opts, timeZone: "UTC" });
};

/** Who is on call this week; with `href`, the whole card links there (the dashboard links to the calendar). */
export async function OnCallNow({ ctx, href }: { ctx: AppContext; href?: string }) {
  const t = await getTranslations();
  const day = await dayFormat();
  const now = new Date();
  const thisWeek = weekOf(now, ctx.organization.timezone);
  const current = await onCallUsersAt(ctx.db, ctx.organization.timezone, now);

  const card = (
    <Card className={cn("mb-6 flex items-center gap-3 p-4", href && "transition hover:border-brand/40")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
        <PhoneCall className="size-4" />
      </span>
      <div className="min-w-0 text-sm">
        <div className="text-xs text-muted">
          {t("onCall.thisWeek", { from: day(thisWeek, { day: "numeric", month: "short" }), to: day(addDays(thisWeek, 6), { day: "numeric", month: "short" }) })}
        </div>
        {current.length > 0 ? (
          <div className="font-medium">
            {current.map((u) => u.name).join(", ")}
            {current.some((u) => u.id === ctx.user.id) && <span className="ml-1.5 text-brand">({t("onCall.youToo")})</span>}
          </div>
        ) : (
          <div className="text-muted">{t("onCall.nobodyNow")}</div>
        )}
      </div>
      {href && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-brand">
          {t("onCall.seeCalendar")}
          <ChevronRight className="size-3.5" />
        </span>
      )}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

/** A month of weeks with who is on call in each (one or more): add / remove per week when `editable`, else just the names. */
export async function OnCallCalendar({ ctx, month: wanted, base, editable }: { ctx: AppContext; month?: string; base: string; editable: boolean }) {
  const t = await getTranslations();
  const day = await dayFormat();
  const tz = ctx.organization.timezone;
  const now = new Date();
  const today = localDay(now, tz);
  const thisWeek = weekOf(now, tz);
  const month = wanted && isMonth(wanted) ? wanted : today.slice(0, 7);
  const weeks = monthWeeks(month);

  const [{ people, color }, rows] = await Promise.all([
    onCallPeople(ctx),
    ctx.db.onCallWeek.findMany({
      where: { weekStart: { gte: weekDate(weeks[0]), lte: weekDate(weeks[weeks.length - 1]) } },
      select: { weekStart: true, userId: true, user: { select: { name: true } } },
    }),
  ]);
  const byWeek = new Map<string, typeof rows>();
  for (const r of rows) byWeek.set(weekKey(r.weekStart), [...(byWeek.get(weekKey(r.weekStart)) ?? []), r]);
  const team = people.map((p) => ({ ...p, color: color.get(p.id) }));
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((i) => day(addDays(weeks[0], i), { weekday: "short" }));
  const monthHref = (m: string) => (m === today.slice(0, 7) ? base : `${base}?month=${m}`);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <Link href={monthHref(shiftMonth(month, -1))} className="rounded-md p-1.5 hover:bg-gray-100" aria-label={t("common.previous")}>
          <ChevronLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="font-medium capitalize">{day(`${month}-01`, { month: "long", year: "numeric" })}</h2>
          {month !== today.slice(0, 7) && (
            <Link href={base} className="text-xs text-brand hover:underline">
              {t("onCall.today")}
            </Link>
          )}
        </div>
        <Link href={monthHref(shiftMonth(month, 1))} className="rounded-md p-1.5 hover:bg-gray-100" aria-label={t("common.next")}>
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="hidden grid-cols-[3rem_repeat(7,minmax(2.25rem,1fr))_minmax(12rem,20rem)] border-b border-border text-center text-xs font-medium uppercase text-muted sm:grid">
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
          const range = `${day(w, { day: "numeric", month: "short" })} – ${day(addDays(w, 6), { day: "numeric", month: "short" })}`;
          // By name; someone who left the team keeps showing on their past weeks.
          const onWeek = (byWeek.get(w) ?? [])
            .map((r) => ({ id: r.userId, name: color.has(r.userId) ? r.user.name : t("onCall.leftTeam", { name: r.user.name }), color: color.get(r.userId) }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <li
              key={w}
              className={cn(
                "grid grid-cols-[1fr_minmax(12rem,20rem)] items-center gap-2 border-b border-l-4 border-border px-3 py-2 last:border-b-0 sm:grid-cols-[3rem_repeat(7,minmax(2.25rem,1fr))_minmax(12rem,20rem)] sm:gap-0 sm:px-0 sm:py-0",
                w === thisWeek && "bg-brand/5",
                w < thisWeek && "opacity-70",
              )}
              style={{ borderLeftColor: onWeek.length === 0 ? "transparent" : onWeek.length === 1 ? (onWeek[0].color ?? "var(--color-border)") : "var(--color-brand)" }}
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
              <div className="min-w-0 py-1 sm:pr-3">
                {editable ? (
                  <WeekPeople week={w} people={onWeek} team={team} label={t("onCall.addTo", { range })} />
                ) : onWeek.length === 0 ? (
                  <span className="text-sm text-muted">{t("onCall.nobody")}</span>
                ) : (
                  <ul className="space-y-0.5 text-sm">
                    {onWeek.map((p) => (
                      <li key={p.id} className="flex items-center gap-1.5">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? "var(--color-muted)" }} />
                        <span className="truncate">
                          {p.name}
                          {p.id === ctx.user.id && <span className="ml-1 text-brand">({t("onCall.you")})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
