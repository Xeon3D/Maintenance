"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { useTranslations } from "next-intl";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { AreaKind } from "@/generated/prisma/enums";
import { addAreaAction, deleteAreaAction, renameAreaAction } from "../actions";

type AreaRow = { id: string; name: string; kind: AreaKind; parentId: string | null; depth: number; assetCount: number };

export function AreasManager({ villaId, areas, canEdit }: { villaId: string; areas: AreaRow[]; canEdit: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionForm(addAreaAction.bind(null, villaId));
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      {areas.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{t("areas.empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {areas.map((a) => (
            <AreaItem key={a.id} area={a} canEdit={canEdit} />
          ))}
        </ul>
      )}
      {canEdit && (
        <form ref={formRef} onSubmit={action} className="flex flex-wrap gap-2 border-t border-border p-4">
          <Input name="name" placeholder={t("areas.namePlaceholder")} required className="h-9 min-w-40 flex-1" />
          <Select name="kind" defaultValue="ROOM" className="h-9 w-auto">
            {Object.values(AreaKind).map((k) => (
              <option key={k} value={k}>
                {t(`areaKind.${k}`)}
              </option>
            ))}
          </Select>
          <Select name="parentId" defaultValue="" className="h-9 w-auto max-w-48">
            <option value="">{t("areas.topLevel")}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {"  ".repeat(a.depth)}
                {a.name}
              </option>
            ))}
          </Select>
          <Button size="sm" className="h-9" disabled={pending}>
            {t("common.add")}
          </Button>
        </form>
      )}
    </div>
  );
}

function AreaItem({ area, canEdit }: { area: AreaRow; canEdit: boolean }) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const [pending, start] = useTransition();

  return (
    <li className="group flex items-center gap-2 px-5 py-2 text-sm" style={{ paddingLeft: `${1.25 + area.depth * 1.25}rem` }}>
      {editing ? (
        <>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1" autoFocus />
          <button
            className="rounded p-1 hover:bg-gray-100"
            disabled={pending}
            onClick={() => start(async () => (await renameAreaAction(area.id, name), setEditing(false)))}
          >
            <Check className="size-4" />
          </button>
          <button className="rounded p-1 hover:bg-gray-100" onClick={() => setEditing(false)}>
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1">
            {area.name}
            <span className="ml-2 text-xs text-muted">{t(`areaKind.${area.kind}`)}</span>
          </span>
          {area.assetCount > 0 && <span className="text-xs text-muted">{t("assets.count", { count: area.assetCount })}</span>}
          {canEdit && (
            <span className="flex gap-1 transition sm:opacity-0 sm:group-hover:opacity-100">
              <button title={t("common.edit")} className="rounded p-1 text-muted hover:bg-gray-100" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
              </button>
              <button
                title={t("common.delete")}
                disabled={pending}
                className="rounded p-1 text-muted hover:bg-red-50 hover:text-danger"
                onClick={() => confirm(t("areas.deleteConfirm")) && start(() => deleteAreaAction(area.id))}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          )}
        </>
      )}
    </li>
  );
}
