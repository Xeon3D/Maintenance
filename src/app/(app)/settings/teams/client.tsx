"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { SystemType } from "@/generated/prisma/enums";
import { addTeamMemberAction, createTeamAction, deleteTeamAction, removeTeamMemberAction } from "../actions";

export function NewTeamForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createTeamAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[1fr_200px_80px_auto] sm:items-end">
      <Field label={t("common.name")}>
        <Input name="name" required />
      </Field>
      <Field label={t("settings.specialty")}>
        <Select name="system" defaultValue="">
          <option value="">—</option>
          {Object.values(SystemType).map((s) => (
            <option key={s} value={s}>
              {t(`systems.${s}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="">
        <Input name="color" type="color" defaultValue="#1f4f8f" className="p-1" />
      </Field>
      <Button disabled={pending}>{t("common.create")}</Button>
      <div className="sm:col-span-4">
        <FormError message={state?.error ? t("common.somethingWrong") : null} />
      </div>
    </form>
  );
}

export function DeleteTeamButton({ id }: { id: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <button
      title={t("common.delete")}
      disabled={pending}
      onClick={() => confirm(t("common.delete") + "?") && start(() => deleteTeamAction(id))}
      className="rounded p-1 text-muted hover:bg-red-50 hover:text-danger"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function RemoveMemberButton({ teamId, userId }: { teamId: string; userId: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <button
      title={t("common.remove")}
      disabled={pending}
      onClick={() => start(() => removeTeamMemberAction(teamId, userId))}
      className="rounded p-1 text-muted hover:bg-gray-100"
    >
      <X className="size-3.5" />
    </button>
  );
}

export function AddMemberSelect({ teamId, options }: { teamId: string; options: { id: string; name: string }[] }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  if (options.length === 0) return null;
  return (
    <Select
      className="h-8"
      value=""
      disabled={pending}
      onChange={(e) => e.target.value && start(() => addTeamMemberAction(teamId, e.target.value))}
    >
      <option value="">+ {t("settings.addMember")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </Select>
  );
}
