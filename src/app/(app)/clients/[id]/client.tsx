"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserX, X } from "lucide-react";
import { Button } from "@/components/ui";
import { anonymizeClientAction, deleteContactAction, setContactReportsAction } from "../actions";

export function DeleteContactButton({ clientId, contactId }: { clientId: string; contactId: string }) {
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <button
      title={t("remove")}
      disabled={pending}
      onClick={() => confirm(`${t("remove")}?`) && start(() => deleteContactAction(clientId, contactId))}
      className="rounded p-1 text-muted hover:bg-gray-100"
    >
      <X className="size-3.5" />
    </button>
  );
}

/** Erases an archived client's personal data (GDPR art. 17) after a confirmation. */
export function AnonymizeClientButton({ clientId }: { clientId: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      title={t("erasure.anonymizeHint")}
      onClick={() =>
        confirm(t("erasure.anonymizeConfirm")) &&
        start(async () => {
          const r = await anonymizeClientAction(clientId);
          if (r.error) alert(t.has(r.error) ? t(r.error) : t("common.somethingWrong"));
        })
      }
    >
      <UserX className="size-4" />
      {t("erasure.anonymize")}
    </Button>
  );
}

/** Toggles whether a contact is copied on e-mailed service reports. */
export function ContactReportsToggle({ clientId, contactId, on }: { clientId: string; contactId: string; on: boolean }) {
  const t = useTranslations("reportEmail");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      title={t("contactToggleHint")}
      onClick={() => start(() => setContactReportsAction(clientId, contactId, !on))}
      className={on ? "mt-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand" : "mt-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:text-foreground"}
    >
      {on ? t("contactOn") : t("contactOff")}
    </button>
  );
}
