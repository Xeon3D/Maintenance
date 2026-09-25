"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { deleteContactAction } from "../actions";

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
