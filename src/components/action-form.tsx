"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { useTranslations } from "next-intl";
import { Button, FormError } from "@/components/ui";
import type { FormResult } from "@/lib/forms";
import { cn } from "@/lib/utils";

const FieldErrorsContext = createContext<Record<string, string> | undefined>(undefined);

/**
 * Wraps a server action (`(prev, formData) => FormResult`) with pending state and error display.
 * Children can be server-rendered inputs; use <FieldError name> next to an input to show its error.
 * On success the action normally redirects; `onSuccessMessage` shows a note if it doesn't.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  successMessage,
  footer,
}: {
  action: (prev: FormResult, form: FormData) => Promise<FormResult>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  successMessage?: string;
  footer?: ReactNode;
}) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionForm(action);
  const generic =
    state?.error && state.error !== "validation"
      ? t.has(state.error as never)
        ? t(state.error as never)
        : state.error
      : state?.error === "validation"
        ? t("checkFields")
        : null;

  return (
    <FieldErrorsContext.Provider value={state?.fieldErrors}>
      <form onSubmit={formAction} className={cn("space-y-4", className)}>
        <fieldset disabled={pending} className="space-y-4">
          {children}
        </fieldset>
        <FormError message={generic} />
        <div className="flex items-center gap-3">
          <Button disabled={pending}>{submitLabel ?? t("save")}</Button>
          {state?.ok && successMessage && <span className="text-sm text-green-700">{successMessage}</span>}
          {footer}
        </div>
      </form>
    </FieldErrorsContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const t = useTranslations("validation");
  const errors = useContext(FieldErrorsContext);
  const code = errors?.[name];
  if (!code) return null;
  return <span className="block text-xs text-danger">{t.has(code as never) ? t(code as never) : t("invalid")}</span>;
}
