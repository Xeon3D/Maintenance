"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, KeyRound, Pencil } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { revealSecretAction, saveSecretAction } from "@/app/(app)/secret-actions";

/** Masked encrypted note. Revealing is audit-logged server side. */
export function SecretField({
  kind,
  id,
  hasValue,
  canView,
  canEdit,
}: {
  kind: "villa" | "asset";
  id: string;
  hasValue: boolean;
  canView: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("secrets");
  const [value, setValue] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const reveal = () =>
    start(async () => {
      setValue(await revealSecretAction(kind, id));
    });

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" autoFocus />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await saveSecretAction(kind, id, draft);
                setValue(draft.trim() || null);
                setEditing(false);
              })
            }
          >
            {t("save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {value !== null ? (
        <pre className="whitespace-pre-wrap rounded-md bg-amber-50 p-3 font-mono text-xs text-amber-950">{value || "—"}</pre>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm text-muted">
          <KeyRound className="size-4" />
          {hasValue ? "••••••••••" : t("empty")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {canView && hasValue && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => (value === null ? reveal() : setValue(null))}>
            {value === null ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {value === null ? t("reveal") : t("hide")}
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setDraft(hasValue ? (value ?? (await revealSecretAction(kind, id))) : "");
                setEditing(true);
              })
            }
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">{t("auditNote")}</p>
    </div>
  );
}
