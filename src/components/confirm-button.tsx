"use client";

import { useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

/** Small icon button that confirms, then runs a bound server action (remove a row, unlink…). */
export function ConfirmIconButton({
  action,
  confirmText,
  title,
  children,
}: {
  action: () => Promise<unknown>;
  confirmText?: string;
  title?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={title ?? t("remove")}
      disabled={pending}
      onClick={() => confirm(confirmText ?? `${title ?? t("remove")}?`) && start(async () => void (await action()))}
      className="rounded p-1 text-muted hover:bg-gray-100 hover:text-danger disabled:opacity-50"
    >
      {children ?? <X className="size-3.5" />}
    </button>
  );
}
