"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Camera, Check, Flag, ListChecks, PenLine, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { ChecklistItemType } from "@/generated/prisma/enums";
import { addItemAction, answerItemAction, applyProcedureAction, deleteItemAction, moveItemAction } from "../actions";

type MeterOpt = { id: string; name: string; unit: string };
type ProcOpt = { id: string; name: string };

export type ChecklistItem = {
  id: string;
  type: ChecklistItemType;
  label: string;
  description: string | null;
  required: boolean;
  options: string[];
  unit: string | null;
  value: string | null;
  note: string | null;
  completedBy: string | null;
};

const isDone = (i: ChecklistItem) => (i.type === "CHECKBOX" ? i.value === "true" : !!i.value);

export function Checklist({
  woId,
  items,
  locked,
  canEdit,
  meters = [],
  procedures = [],
}: {
  woId: string;
  items: ChecklistItem[];
  meters?: MeterOpt[]; // meters on the WO's asset
  procedures?: ProcOpt[];
  locked: boolean; // WO closed or user can't execute
  canEdit: boolean; // may change the checklist's structure
}) {
  const t = useTranslations("checklist");
  const [editing, setEditing] = useState(false);
  const answerable = items.filter((i) => i.type !== "HEADING");
  const done = answerable.filter(isDone).length;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-medium">
          <ListChecks className="size-4 text-muted" />
          {t("title")}
          {answerable.length > 0 && (
            <span className="text-sm font-normal text-muted">
              {done}/{answerable.length}
            </span>
          )}
        </h2>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? t("doneEditing") : t("edit")}
          </Button>
        )}
      </div>
      {answerable.length > 0 && (
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-green-500 transition-all" style={{ width: `${(done / answerable.length) * 100}%` }} />
        </div>
      )}
      {items.length === 0 && !editing && <p className="px-5 py-4 text-sm text-muted">{t("empty")}</p>}
      <ul className="divide-y divide-border">
        {items.map((item, idx) => (
          <li key={item.id} className={cn("px-5 py-3", item.type === "HEADING" && "bg-gray-50")}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <ItemRow woId={woId} item={item} locked={locked || editing} />
              </div>
              {editing && (
                <ItemEditControls woId={woId} itemId={item.id} first={idx === 0} last={idx === items.length - 1} />
              )}
            </div>
          </li>
        ))}
      </ul>
      {editing && <AddItemForm woId={woId} meters={meters} />}
      {editing && procedures.length > 0 && <ApplyProcedure woId={woId} procedures={procedures} />}
    </div>
  );
}

function ItemRow({ woId, item, locked }: { woId: string; item: ChecklistItem; locked: boolean }) {
  const t = useTranslations("checklist");
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const save = (value: string | null) =>
    start(async () => {
      setError(false);
      try {
        await answerItemAction(woId, item.id, value);
      } catch {
        setError(true);
      }
    });

  if (item.type === "HEADING") return <h3 className="text-sm font-semibold">{item.label}</h3>;

  const label = (
    <div className="mb-1.5 text-sm">
      {item.label}
      {item.required && <span className="ml-0.5 text-danger">*</span>}
      {item.description && <div className="text-xs text-muted">{item.description}</div>}
    </div>
  );

  let control: React.ReactNode = null;
  switch (item.type) {
    case "CHECKBOX":
      return (
        <label className={cn("flex cursor-pointer items-start gap-3 text-sm", locked && "cursor-default")}>
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-green-600"
            checked={item.value === "true"}
            disabled={locked || pending}
            onChange={(e) => save(e.target.checked ? "true" : null)}
          />
          <span className={cn(item.value === "true" && "text-muted line-through")}>
            {item.label}
            {item.required && <span className="ml-0.5 text-danger">*</span>}
            {item.description && <span className="block text-xs text-muted no-underline">{item.description}</span>}
          </span>
        </label>
      );
    case "PASS_FAIL":
      control = (
        <div className="flex gap-2">
          {(
            [
              ["PASS", Check, "border-green-400 bg-green-50 text-green-800"],
              ["FLAG", Flag, "border-amber-400 bg-amber-50 text-amber-800"],
              ["FAIL", X, "border-red-400 bg-red-50 text-red-800"],
            ] as const
          ).map(([v, Icon, tone]) => (
            <button
              key={v}
              type="button"
              disabled={locked || pending}
              onClick={() => save(item.value === v ? null : v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm",
                item.value === v ? tone : "border-border text-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(`pf.${v}`)}
            </button>
          ))}
        </div>
      );
      break;
    case "MULTIPLE_CHOICE":
      control = (
        <div className="flex flex-wrap gap-2">
          {item.options.map((o) => (
            <button
              key={o}
              type="button"
              disabled={locked || pending}
              onClick={() => save(item.value === o ? null : o)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                item.value === o ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:text-foreground",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "TEXT":
      control = (
        <textarea
          defaultValue={item.value ?? ""}
          disabled={locked}
          onBlur={(e) => e.target.value !== (item.value ?? "") && save(e.target.value || null)}
          className="min-h-16 w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-gray-50"
        />
      );
      break;
    case "NUMBER":
    case "METER_READING":
      control = (
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            defaultValue={item.value ?? ""}
            disabled={locked}
            onBlur={(e) => e.target.value !== (item.value ?? "") && save(e.target.value.replace(",", ".") || null)}
            className="h-9 w-36"
          />
          {item.unit && <span className="text-sm text-muted">{item.unit}</span>}
        </div>
      );
      break;
    case "PHOTO":
      control = <PhotoAnswer item={item} locked={locked} onSaved={save} />;
      break;
    case "SIGNATURE":
      control = <SignatureAnswer item={item} locked={locked} onSaved={save} />;
      break;
  }

  return (
    <div>
      {label}
      {control}
      {item.completedBy && <div className="mt-1 text-xs text-muted">{t("answeredBy", { name: item.completedBy })}</div>}
      {error && <div className="mt-1 text-xs text-danger">{t("saveFailed")}</div>}
    </div>
  );
}

function PhotoAnswer({ item, locked, onSaved }: { item: ChecklistItem; locked: boolean; onSaved: (v: string | null) => void }) {
  const t = useTranslations("checklist");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (item.value) {
    return (
      <a href={`/api/files/${item.value}`} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/${item.value}`} alt={item.label} className="h-28 rounded-md border border-border object-cover" />
      </a>
    );
  }
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const up = await uploadFile(f, { workOrderItemId: item.id });
            onSaved(up.id);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button size="sm" variant="secondary" disabled={locked || busy} onClick={() => input.current?.click()}>
        <Camera className="size-4" />
        {busy ? t("uploading") : t("takePhoto")}
      </Button>
    </>
  );
}

function SignatureAnswer({ item, locked, onSaved }: { item: ChecklistItem; locked: boolean; onSaved: (v: string | null) => void }) {
  const t = useTranslations("checklist");
  const pad = useRef<SignaturePadHandle>(null);
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [busy, setBusy] = useState(false);
  if (item.value) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${item.value}`} alt={item.label} className="h-20 rounded-md border border-border bg-white" />;
  }
  if (!open) {
    return (
      <Button size="sm" variant="secondary" disabled={locked} onClick={() => setOpen(true)}>
        <PenLine className="size-4" />
        {t("sign")}
      </Button>
    );
  }
  return (
    <div className="max-w-md space-y-2">
      <SignaturePad ref={pad} onChange={setEmpty} />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={empty || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const blob = await pad.current!.toBlob();
              if (!blob) return;
              const up = await uploadFile(blob, { workOrderItemId: item.id }, "signature.png");
              onSaved(up.id);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("saveSignature")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => pad.current?.clear()}>
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}

function ItemEditControls({ woId, itemId, first, last }: { woId: string; itemId: string; first: boolean; last: boolean }) {
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  const btn = "rounded p-1 text-muted hover:bg-gray-100 disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-0.5">
      <button className={btn} disabled={first || pending} onClick={() => start(() => moveItemAction(woId, itemId, -1))} aria-label="Up">
        <ArrowUp className="size-4" />
      </button>
      <button className={btn} disabled={last || pending} onClick={() => start(() => moveItemAction(woId, itemId, 1))} aria-label="Down">
        <ArrowDown className="size-4" />
      </button>
      <button
        className={cn(btn, "hover:bg-red-50 hover:text-danger")}
        disabled={pending}
        title={t("delete")}
        onClick={() => confirm(`${t("delete")}?`) && start(() => deleteItemAction(woId, itemId))}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function AddItemForm({ woId, meters }: { woId: string; meters: MeterOpt[] }) {
  const t = useTranslations();
  const [type, setType] = useState<ChecklistItemType>("CHECKBOX");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [unit, setUnit] = useState("");
  const [meterId, setMeterId] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-2 border-t border-border bg-gray-50/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        start(async () => {
          await addItemAction(woId, {
            type,
            label,
            required: type === "HEADING" ? false : required,
            options: type === "MULTIPLE_CHOICE" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [],
            unit: (type === "METER_READING" && meters.find((m) => m.id === meterId)?.unit) || unit.trim() || null,
            meterId: type === "METER_READING" && meterId ? meterId : null,
          });
          setLabel("");
          setOptions("");
        });
      }}
    >
      <div className="flex flex-wrap gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value as ChecklistItemType)} className="h-9 w-auto">
          {Object.values(ChecklistItemType).map((v) => (
            <option key={v} value={v}>
              {t(`checklist.types.${v}`)}
            </option>
          ))}
        </Select>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("checklist.labelPlaceholder")} className="h-9 min-w-48 flex-1" />
        {type === "METER_READING" && meters.length > 0 && (
          <Select value={meterId} onChange={(e) => setMeterId(e.target.value)} className="h-9 w-auto">
            <option value="">{t("checklist.noMeter")}</option>
            {meters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </Select>
        )}
        {(type === "NUMBER" || (type === "METER_READING" && !meterId)) && (
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("checklist.unit")} className="h-9 w-24" />
        )}
      </div>
      {type === "MULTIPLE_CHOICE" && (
        <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder={t("checklist.optionsPlaceholder")} className="h-9" />
      )}
      <div className="flex items-center justify-between">
        {type !== "HEADING" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            {t("checklist.required")}
          </label>
        ) : (
          <span />
        )}
        <Button size="sm" disabled={pending || !label.trim()}>
          <Plus className="size-4" />
          {t("common.add")}
        </Button>
      </div>
    </form>
  );
}

function ApplyProcedure({ woId, procedures }: { woId: string; procedures: ProcOpt[] }) {
  const t = useTranslations("checklist");
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2 border-t border-border bg-gray-50/60 px-4 py-3 text-sm">
      <span className="text-muted">{t("fromProcedure")}</span>
      <Select
        value=""
        disabled={pending}
        onChange={(e) => e.target.value && start(() => applyProcedureAction(woId, e.target.value))}
        className="h-9 w-auto flex-1"
      >
        <option value="">—</option>
        {procedures.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}