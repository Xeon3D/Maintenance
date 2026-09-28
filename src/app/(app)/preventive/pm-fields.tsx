"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { FieldError } from "@/components/action-form";
import { DateTimeField } from "@/components/datetime-field";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { occurrencesBetween } from "@/lib/pm-schedule";
import { flattenTree } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { Frequency, Priority, SystemType, type PMTrigger } from "@/generated/prisma/enums";

type Ref = { id: string; name: string; villaId: string; parentId: string | null };

export type PMDefaults = {
  title?: string;
  description?: string | null;
  procedureId?: string | null;
  villaId?: string | null;
  assetId?: string | null;
  teamId?: string | null;
  system?: SystemType | null;
  priority?: Priority;
  estimatedMinutes?: number | null;
  trigger?: PMTrigger;
  frequency?: Frequency | null;
  interval?: number;
  daysOfWeek?: number[];
  startDate?: string | null;
  endDate?: string | null;
  leadDays?: number;
  meterId?: string | null;
  meterInterval?: number | null;
  assigneeIds?: string[];
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function PMFields({
  pm,
  procedures,
  villas,
  assets,
  meters,
  teams,
  people,
  timeZone,
}: {
  pm: PMDefaults;
  timeZone: string;
  procedures: { id: string; name: string; system: SystemType | null }[];
  villas: { id: string; name: string }[];
  assets: (Ref & { system: SystemType })[];
  meters: { id: string; name: string; unit: string; assetId: string; assetName: string; lastValue: number | null }[];
  teams: { id: string; name: string; memberIds: string[] }[];
  people: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const format = useFormatter();
  const [trigger, setTrigger] = useState<PMTrigger>(pm.trigger ?? "TIME");
  const [villaId, setVillaId] = useState(pm.villaId ?? "");
  const [assetId, setAssetId] = useState(pm.assetId ?? "");
  const [system, setSystem] = useState<string>(pm.system ?? "");
  const [title, setTitle] = useState(pm.title ?? "");
  const [frequency, setFrequency] = useState<Frequency>(pm.frequency ?? "MONTHLY");
  const [interval, setInterval] = useState(pm.interval ?? 1);
  const [days, setDays] = useState<Set<number>>(new Set(pm.daysOfWeek ?? []));
  const [startIso, setStartIso] = useState(pm.startDate ?? "");
  const [meterId, setMeterId] = useState(pm.meterId ?? "");
  const [assignees, setAssignees] = useState<Set<string>>(new Set(pm.assigneeIds ?? []));

  const villaAssets = useMemo(() => flattenTree(assets.filter((a) => a.villaId === villaId)), [assets, villaId]);
  const assetMeters = meters.filter((m) => !assetId || m.assetId === assetId);

  const preview = useMemo(() => {
    if (trigger !== "TIME" || !startIso) return [];
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return [];
    const now = new Date();
    return occurrencesBetween(
      { frequency, interval: Math.max(1, interval || 1), daysOfWeek: frequency === "WEEKLY" ? [...days] : [], startDate: start, endDate: null, timeZone },
      start > now ? start : now,
      new Date(Math.max(start.getTime(), now.getTime()) + 3 * 366 * 86_400_000),
      5,
    );
  }, [trigger, startIso, frequency, interval, days, timeZone]);

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  return (
    <>
      <Field label={t("wo.title")}>
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t("pm.titlePlaceholder")} />
        <FieldError name="title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("pm.procedure")} hint={t("pm.procedureHint")}>
          <Select
            name="procedureId"
            defaultValue={pm.procedureId ?? ""}
            onChange={(e) => {
              const p = procedures.find((x) => x.id === e.target.value);
              if (p && !title) setTitle(p.name);
              if (p?.system && !system) setSystem(p.system);
            }}
          >
            <option value="">—</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("wo.priority")}>
          <Select name="priority" defaultValue={pm.priority ?? "MEDIUM"}>
            {Object.values(Priority).map((v) => (
              <option key={v} value={v}>
                {t(`priority.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("wo.descriptionLabel")}>
        <Textarea name="description" defaultValue={pm.description ?? ""} className="min-h-16" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("assets.villa")}>
          <Select
            name="villaId"
            value={villaId}
            onChange={(e) => {
              setVillaId(e.target.value);
              setAssetId("");
            }}
          >
            <option value="">—</option>
            {villas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("wo.asset")}>
          <Select
            name="assetId"
            value={assetId}
            disabled={!villaId}
            onChange={(e) => {
              setAssetId(e.target.value);
              const a = assets.find((x) => x.id === e.target.value);
              if (a && !system) setSystem(a.system);
            }}
          >
            <option value="">—</option>
            {villaAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {"  ".repeat(a.depth)}
                {a.name}
              </option>
            ))}
          </Select>
          <FieldError name="assetId" />
        </Field>
        <Field label={t("assets.system")}>
          <Select name="system" value={system} onChange={(e) => setSystem(e.target.value)}>
            <option value="">—</option>
            {Object.values(SystemType).map((s) => (
              <option key={s} value={s}>
                {t(`systems.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <section className="space-y-4 rounded-md border border-border p-4">
        <input type="hidden" name="trigger" value={trigger} />
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(["TIME", "METER"] as const).map((tr) => (
            <button
              key={tr}
              type="button"
              onClick={() => setTrigger(tr)}
              className={cn("rounded px-3 py-1.5 text-sm", trigger === tr ? "bg-brand text-brand-foreground" : "text-muted")}
            >
              {t(`pm.trigger.${tr}`)}
            </button>
          ))}
        </div>

        {trigger === "TIME" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <Field label={t("pm.everyLabel")}>
                <Input name="interval" type="number" min={1} max={365} value={interval} onChange={(e) => setInterval(Number(e.target.value))} />
              </Field>
              <Field label="&nbsp;">
                <Select name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                  {Object.values(Frequency).map((f) => (
                    <option key={f} value={f}>
                      {t(`pm.frequency.${f}`, { count: interval })}
                    </option>
                  ))}
                </Select>
                <FieldError name="frequency" />
              </Field>
            </div>
            {frequency === "WEEKLY" && (
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <label
                    key={d}
                    className={cn(
                      "cursor-pointer rounded-md border px-2.5 py-1 text-sm",
                      days.has(d) ? "border-brand bg-brand/10 text-brand" : "border-border text-muted",
                    )}
                  >
                    <input type="checkbox" name="daysOfWeek" value={d} checked={days.has(d)} onChange={() => setDays(toggle(days, d))} className="sr-only" />
                    {format.dateTime(new Date(Date.UTC(2024, 0, 7 + d)), { weekday: "short", timeZone: "UTC" })}
                  </label>
                ))}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("pm.startDate")}>
                <DateTimeField name="startDate" defaultValue={pm.startDate} onChange={setStartIso} />
                <FieldError name="startDate" />
              </Field>
              <Field label={t("pm.endDate")}>
                <DateTimeField name="endDate" defaultValue={pm.endDate} />
                <FieldError name="endDate" />
              </Field>
              <Field label={t("pm.leadDays")} hint={t("pm.leadDaysHint")}>
                <Input name="leadDays" type="number" min={0} max={60} defaultValue={pm.leadDays ?? 0} />
              </Field>
            </div>
            {preview.length > 0 && (
              <div className="text-sm">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t("pm.nextOccurrences")}</div>
                <ul className="flex flex-wrap gap-2">
                  {preview.map((d) => (
                    <li key={d.toISOString()} className="rounded-md bg-gray-100 px-2 py-1 text-xs">
                      {format.dateTime(d, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("pm.meter")}>
              <Select name="meterId" value={meterId} onChange={(e) => setMeterId(e.target.value)}>
                <option value="">—</option>
                {assetMeters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.assetName} · {m.name} ({m.unit})
                  </option>
                ))}
              </Select>
              <FieldError name="meterId" />
              {assetMeters.length === 0 && <span className="text-xs text-muted">{t("pm.noMeters")}</span>}
            </Field>
            <Field
              label={t("pm.meterInterval")}
              hint={meters.find((m) => m.id === meterId)?.lastValue != null ? t("pm.currentReading", { value: meters.find((m) => m.id === meterId)!.lastValue! }) : undefined}
            >
              <Input name="meterInterval" inputMode="decimal" defaultValue={pm.meterInterval ?? ""} placeholder="500" />
              <FieldError name="meterInterval" />
            </Field>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("wo.team")}>
          <Select
            name="teamId"
            defaultValue={pm.teamId ?? ""}
            onChange={(e) => {
              const team = teams.find((x) => x.id === e.target.value);
              if (team && assignees.size === 0) setAssignees(new Set(team.memberIds));
            }}
          >
            <option value="">—</option>
            {teams.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("wo.estimatedHours")}>
          <Input name="estimatedHours" inputMode="decimal" defaultValue={pm.estimatedMinutes != null ? String(+(pm.estimatedMinutes / 60).toFixed(2)) : ""} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("wo.assignees")}</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <label
              key={p.id}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-sm",
                assignees.has(p.id) ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-gray-50",
              )}
            >
              <input type="checkbox" name="assigneeIds" value={p.id} checked={assignees.has(p.id)} onChange={() => setAssignees(toggle(assignees, p.id))} className="sr-only" />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
