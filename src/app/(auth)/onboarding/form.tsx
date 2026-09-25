"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import { createOrgAction } from "../actions";

export function OnboardingForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionForm(createOrgAction);
  return (
    <form onSubmit={action} className="space-y-4">
      <Field label={t("auth.companyName")}>
        <Input name="company" required autoFocus />
      </Field>
      <FormError message={state?.error ? t("common.somethingWrong") : null} />
      <Button className="w-full" disabled={pending}>
        {t("common.create")}
      </Button>
    </form>
  );
}
