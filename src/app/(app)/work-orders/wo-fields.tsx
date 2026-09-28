"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/action-form";
import { DateTimeField } from "@/components/datetime-field";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { flattenTree } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { Priority, SystemType, WorkOrderType } from "@/generated/prisma/enums";

type Ref = { id: string; name: string; villaId: string; parentId: string | null };

export type WODefaults = {
  title?: string;
  description?: string | null;
  priority?: Priority;
  type?: WorkOrderType;
  system?: SystemType | null;
  villaId?: string | null;
  areaId?: string | null;
  assetId?: string | null;
  teamId?: string | null;
  dueDate?: string | null; // ISO
  startDate?: string | null;
  estimatedMinutes?: number | null;
  assigneeIds?: string[];
};

export function WorkOrderFields({
  wo,
  villas,
  areas,
  assets,
  teams,
  people,
  procedures,
}: {
  wo: WODefaults;
  villas: { id: string; name: string; code: string | null }[];
  areas: Ref[];
  assets: (Ref & { system: SystemType })[];
  teams: { id: string; name: string; memberIds: string[] }[];
  people: { id: string; name: string }[];
  procedures?: { id: string; name: string }[]; // offered when creating
}) {
  const t = useTranslations();
  const [villaId, setVillaId] = useState(wo.villaId ?? "");
  const [assetId, setAssetId] = useState(wo.assetId ?? "");
  const [system, setSystem] = useState<string>(wo.system ?? "");
  const [assignees, setAssignees] = useState<Set<string>>(new Set(wo.assigneeIds ?? []));
  const [title, setTitle] = useState(wo.title ?? "");

  const villaAreas = useMemo(() => flattenTree(areas.filter((a) => a.villaId === villaId)), [areas, villaId]);
  const villaAssets = useMemo(() => flattenTree(assets.filter((a) => a.villaId === villaId)), [assets, villaId]);

  const toggle = (id: string) =>
    setAssignees((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <Field label={t("wo.title")}>
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus placeholder={t("wo.titlePlaceholder")} />
        <FieldError name="title" />
      </Field>
      {procedures && procedures.length > 0 && (
        <Field label={t("pm.procedure")} hint={t("wo.procedureHint")}>
          <Select
            name="procedureId"
            defaultValue=""
            onChange={(e) => {
              const p = procedures.find((x) => x.id === e.target.value);
              if (p && !title.trim()) setTitle(p.name);
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
      )}
      <Field label={t("wo.descriptionLabel")}>
        <Textarea name="description" defaultValue={wo.description ?? ""} />
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
                {v.code ? ` (${v.code})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("assets.area")}>
          <Select key={`a-${villaId}`} name="areaId" defaultValue={wo.villaId === villaId ? (wo.areaId ?? "") : ""} disabled={!villaId}>
            <option value="">—</option>
            {villaAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {"  ".repeat(a.depth)}
                {a.name}
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
              if (a) setSystem(a.system);
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <Field label={t("wo.type")}>
          <Select name="type" defaultValue={wo.type ?? "REACTIVE"}>
            {Object.values(WorkOrderType).map((v) => (
              <option key={v} value={v}>
                {t(`woType.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("wo.priority")}>
          <Select name="priority" defaultValue={wo.priority ?? "NONE"}>
            {Object.values(Priority).map((v) => (
              <option key={v} value={v}>
                {t(`priority.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("wo.startDate")}>
          <DateTimeField name="startDate" defaultValue={wo.startDate} />
        </Field>
        <Field label={t("wo.dueDate")}>
          <DateTimeField name="dueDate" defaultValue={wo.dueDate} />
        </Field>
        <Field label={t("wo.estimatedHours")}>
          <Input
            name="estimatedHours"
            inputMode="decimal"
            defaultValue={wo.estimatedMinutes != null ? String(+(wo.estimatedMinutes / 60).toFixed(2)) : ""}
          />
          <FieldError name="estimatedHours" />
        </Field>
      </div>

      <Field label={t("wo.team")}>
        <Select
          name="teamId"
          defaultValue={wo.teamId ?? ""}
          onChange={(e) => {
            // Picking a team pre-selects its members when nobody is assigned yet.
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
              <input type="checkbox" name="assigneeIds" value={p.id} checked={assignees.has(p.id)} onChange={() => toggle(p.id)} className="sr-only" />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
