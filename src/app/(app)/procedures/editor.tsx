"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, Field, FormError, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChecklistItemType, SystemType } from "@/generated/prisma/enums";
import { saveProcedureAction, type ProcedureInput } from "./actions";

type Item = {
  key: number;
  type: ChecklistItemType;
  label: string;
  description: string;
  required: boolean;
  options: string; // comma separated in the editor
  unit: string;
};

let seq = 0;
const blank = (type: ChecklistItemType = "PASS_FAIL"): Item => ({ key: ++seq, type, label: "", description: "", required: type !== "HEADING", options: "", unit: "" });

export function ProcedureEditor({
  id,
  initial,
}: {
  id: string | null;
  initial?: { name: string; description: string | null; system: SystemType | null; items: Omit<ProcedureInput["items"][number], "key">[] };
}) {
  const t = useTranslations();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [system, setSystem] = useState<string>(initial?.system ?? "");
  const [items, setItems] = useState<Item[]>(
    initial?.items.map((i) => ({
      key: ++seq,
      type: i.type,
      label: i.label,
      description: i.description ?? "",
      required: i.required ?? false,
      options: (i.options ?? []).join(", "),
      unit: i.unit ?? "",
    })) ?? [blank("HEADING"), blank()],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const update = (key: number, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const move = (idx: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });

  const save = () =>
    start(async () => {
      setError(null);
      const filled = items.filter((i) => i.label.trim());
      if (!name.trim() || filled.length === 0) {
        setError(t("procedures.needNameAndStep"));
        return;
      }
      const res = await saveProcedureAction(id, {
        name,
        description: description || null,
        system: (system || null) as SystemType | null,
        items: filled.map((i) => ({
          type: i.type,
          label: i.label,
          description: i.description || null,
          required: i.required,
          options: i.type === "MULTIPLE_CHOICE" ? i.options.split(",").map((o) => o.trim()).filter(Boolean) : [],
          unit: i.type === "NUMBER" || i.type === "METER_READING" ? i.unit || null : null,
        })),
      });
      if (res?.error) setError(t("common.somethingWrong"));
    });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label={t("common.name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("procedures.namePlaceholder")} autoFocus={!id} />
        </Field>
        <Field label={t("assets.system")}>
          <Select value={system} onChange={(e) => setSystem(e.target.value)}>
            <option value="">—</option>
            {Object.values(SystemType).map((s) => (
              <option key={s} value={s}>
                {t(`systems.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("wo.descriptionLabel")}>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
      </Field>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("procedures.steps")}</h2>
        <ol className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.key} className={cn("rounded-md border border-border p-3", item.type === "HEADING" && "bg-gray-50")}>
              <div className="flex flex-wrap items-start gap-2">
                <span className="mt-2 w-6 text-right text-xs text-muted">{item.type === "HEADING" ? "§" : idx + 1}</span>
                <Select value={item.type} onChange={(e) => update(item.key, { type: e.target.value as ChecklistItemType })} className="h-9 w-auto">
                  {Object.values(ChecklistItemType).map((v) => (
                    <option key={v} value={v}>
                      {t(`checklist.types.${v}`)}
                    </option>
                  ))}
                </Select>
                <Input
                  value={item.label}
                  onChange={(e) => update(item.key, { label: e.target.value })}
                  placeholder={item.type === "HEADING" ? t("procedures.sectionPlaceholder") : t("checklist.labelPlaceholder")}
                  className={cn("h-9 min-w-48 flex-1", item.type === "HEADING" && "font-semibold")}
                />
                <div className="flex gap-0.5">
                  <button type="button" className="rounded p-2 text-muted hover:bg-gray-100 disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-2 text-muted hover:bg-gray-100 disabled:opacity-30"
                    disabled={idx === items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-2 text-muted hover:bg-red-50 hover:text-danger"
                    onClick={() => setItems((l) => l.filter((x) => x.key !== item.key))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {item.type !== "HEADING" && (
                <div className="ml-8 mt-2 flex flex-wrap items-center gap-3">
                  {(item.type === "NUMBER" || item.type === "METER_READING") && (
                    <Input value={item.unit} onChange={(e) => update(item.key, { unit: e.target.value })} placeholder={t("checklist.unit")} className="h-8 w-24" />
                  )}
                  {item.type === "MULTIPLE_CHOICE" && (
                    <Input
                      value={item.options}
                      onChange={(e) => update(item.key, { options: e.target.value })}
                      placeholder={t("checklist.optionsPlaceholder")}
                      className="h-8 min-w-64 flex-1"
                    />
                  )}
                  <Input
                    value={item.description}
                    onChange={(e) => update(item.key, { description: e.target.value })}
                    placeholder={t("procedures.hintPlaceholder")}
                    className="h-8 min-w-48 flex-1 text-xs"
                  />
                  <label className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={item.required} onChange={(e) => update(item.key, { required: e.target.checked })} />
                    {t("checklist.required")}
                  </label>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setItems((l) => [...l, blank()])}>
            <Plus className="size-4" />
            {t("procedures.addStep")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => [...l, blank("HEADING")])}>
            <Plus className="size-4" />
            {t("procedures.addSection")}
          </Button>
        </div>
      </div>

      <FormError message={error} />
      <Button onClick={save} disabled={pending}>
        {id ? t("common.save") : t("common.create")}
      </Button>
    </div>
  );
}
