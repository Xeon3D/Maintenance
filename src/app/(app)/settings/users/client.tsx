"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { ASSIGNABLE_ROLES } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/enums";
import { inviteUserAction, revokeInviteAction, updateMemberAction } from "../actions";

export function InviteForm({ clients }: { clients: { id: string; name: string }[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(inviteUserAction, undefined);
  const [role, setRole] = useState<Role>("TECHNICIAN");
  const [copied, setCopied] = useState(false);
  const fullUrl = state?.inviteUrl && typeof window !== "undefined" ? window.location.origin + state.inviteUrl : null;

  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <Field label={t("common.email")}>
          <Input name="email" type="email" required />
        </Field>
        <Field label={t("common.role")}>
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Button disabled={pending}>{t("settings.inviteSend")}</Button>
        {role === "REQUESTER" && (
          <div className="sm:col-span-3">
            <Field label={t("settings.client")} hint={t("settings.clientHint")}>
              <Select name="clientId" required>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </form>
      <FormError message={state?.error ? t("common.somethingWrong") : null} />
      {fullUrl && (
        <div className="rounded-md border border-border bg-gray-50 p-3 text-sm">
          <p className="mb-2 text-muted">{t("settings.inviteLink", { email: state?.inviteEmail ?? "" })}</p>
          <div className="flex gap-2">
            <Input readOnly value={fullUrl} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(fullUrl);
                setCopied(true);
              }}
            >
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MemberControls({ id, role, active }: { id: string; role: Role; active: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <div className="inline-flex items-center gap-2">
      <Select
        className="h-8 w-44"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => start(() => updateMemberAction(id, { role: e.target.value as Role }))}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        variant={active ? "danger" : "secondary"}
        disabled={pending}
        onClick={() => start(() => updateMemberAction(id, { active: !active }))}
      >
        {active ? t("settings.deactivate") : t("settings.reactivate")}
      </Button>
    </div>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => revokeInviteAction(id))}>
      {t("settings.revoke")}
    </Button>
  );
}
