"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { deleteMeterAction, saveMeterAction } from "./actions";

type MeterValues = { id: string; name: string; unit: string; lowerLimit: number | null; upperLimit: number | null; alertWorkOrder: boolean };

/** Add (no meter) or edit a meter, as a toggle-open inline form. */
export function MeterFormToggle({ assetId, meter }: { assetId: string; meter?: MeterValues }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return meter ? (
      <span className="flex gap-0.5">
        <button className="rounded p-1 text-muted hover:bg-gray-100" title={t("common.edit")} onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
        </button>
        <button
          className="rounded p-1 text-muted hover:bg-red-50 hover:text-danger"
          title={t("common.delete")}
          disabled={pending}
          onClick={() => confirm(t("meters.deleteConfirm")) && start(() => deleteMeterAction(meter.id))}
        >
          <Trash2 className="size-3.5" />
        </button>
      </span>
    ) : (
      <button className="inline-flex items-center gap-1 text-sm font-medium text-brand" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("meters.add")}
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-md border border-border p-3">
      <ActionForm
        action={async (prev, form) => {
          const res = await saveMeterAction(assetId, meter?.id ?? null, prev, form);
          if (res?.ok) setOpen(false);
          return res;
        }}
        submitLabel={meter ? t("common.save") : t("common.add")}
        footer={
          <button type="button" className="text-sm text-muted" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <Field label={t("common.name")}>
            <Input name="name" defaultValue={meter?.name} required placeholder={t("meters.namePlaceholder")} />
            <FieldError name="name" />
          </Field>
          <Field label={t("checklist.unit")}>
            <Input name="unit" defaultValue={meter?.unit} required placeholder="%, h, °C" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("meters.lowerLimit")}>
            <Input name="lowerLimit" inputMode="decimal" defaultValue={meter?.lowerLimit ?? ""} />
          </Field>
          <Field label={t("meters.upperLimit")}>
            <Input name="upperLimit" inputMode="decimal" defaultValue={meter?.upperLimit ?? ""} />
            <FieldError name="upperLimit" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="alertWorkOrder" defaultChecked={meter?.alertWorkOrder ?? true} />
          {t("meters.alertWorkOrder")}
        </label>
      </ActionForm>
    </div>
  );
}
