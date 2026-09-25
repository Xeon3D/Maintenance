"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import { createOrgAction } from "../actions";

export function OnboardingForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createOrgAction, undefined);
  return (
    <form action={action} className="space-y-4">
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
