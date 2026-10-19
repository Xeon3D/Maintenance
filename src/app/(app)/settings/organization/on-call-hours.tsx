"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/action-form";
import { TimeInput } from "@/components/date-input";
import { DEFAULT_ON_CALL_HOURS, endsNextDay, type OnCallHours } from "@/lib/on-call";
import { cn } from "@/lib/utils";

// Monday first, Sunday last (day numbers: 0 = Sunday).
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** Settings → Organization: when whoever is on call receives new client requests (always, or only in these hours). */
export function OnCallHoursFields({ hours, weekdays }: { hours: OnCallHours | null; weekdays: string[] }) {
  const t = useTranslations("onCallHours");
  const [mode, setMode] = useState(hours ? "hours" : "always");
  const initial = hours ?? DEFAULT_ON_CALL_HOURS;
  // Kept in state only to say "next day" as the times change.
  const [times, setTimes] = useState(() => initial.days.map((d, i) => d ?? DEFAULT_ON_CALL_HOURS.days[i]!));
  const setTime = (d: number, key: "start" | "end", v: string) => setTimes((all) => all.map((x, i) => (i === d ? { ...x, [key]: v } : x)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {(["always", "hours"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2">
            <input type="radio" name="onCallMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="size-4 accent-brand" />
            {t(m)}
          </label>
        ))}
      </div>

      <div className={cn("space-y-2", mode !== "hours" && "pointer-events-none opacity-50")} aria-disabled={mode !== "hours"}>
        <p className="text-xs text-muted">{t("nextDayHint")}</p>
        {WEEK.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex w-36 items-center gap-2">
              <input type="checkbox" name={`onCallOn${d}`} defaultChecked={!!initial.days[d]} className="size-4 accent-brand" />
              {weekdays[d]}
            </label>
            <TimeInput name={`onCallStart${d}`} defaultValue={times[d].start} onChange={(v) => setTime(d, "start", v)} className="w-24" aria-label={`${weekdays[d]} ${t("from")}`} />
            <span className="text-muted">–</span>
            <TimeInput name={`onCallEnd${d}`} defaultValue={times[d].end} onChange={(v) => setTime(d, "end", v)} className="w-24" aria-label={`${weekdays[d]} ${t("to")}`} />
            {endsNextDay(times[d]) && <span className="text-xs text-muted">{times[d].start === times[d].end ? t("allDay") : t("nextDay")}</span>}
            <FieldError name={`onCallEnd${d}`} />
          </div>
        ))}
        <label className="flex items-center gap-2 pt-1 text-sm">
          <input type="checkbox" name="onCallHolidays" defaultChecked={initial.holidays} className="size-4 accent-brand" />
          {t("holidays")}
        </label>
      </div>
    </div>
  );
}
