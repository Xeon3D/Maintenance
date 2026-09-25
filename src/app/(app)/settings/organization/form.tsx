"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { updateOrgAction } from "../actions";

const TIMEZONES = [
  "Europe/Lisbon",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Dubai",
  "America/Sao_Paulo",
  "America/New_York",
  "UTC",
];

export function OrgForm({ org }: { org: { name: string; timezone: string; currency: string; defaultLocale: string } }) {
  const t = useTranslations();
  const [state, action, pending] = useActionForm(updateOrgAction);
  return (
    <form onSubmit={action} className="space-y-4">
      <Field label={t("common.name")}>
        <Input name="name" defaultValue={org.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("settings.timezone")}>
          <Select name="timezone" defaultValue={org.timezone}>
            {(TIMEZONES.includes(org.timezone) ? TIMEZONES : [org.timezone, ...TIMEZONES]).map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("settings.currency")}>
          <Select name="currency" defaultValue={org.currency}>
            {["EUR", "GBP", "USD", "AED", "BRL", "CHF"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("settings.defaultLanguage")}>
        <Select name="defaultLocale" defaultValue={org.defaultLocale}>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </Select>
      </Field>
      <FormError message={state?.error ? t("common.somethingWrong") : null} />
      <div className="flex items-center gap-3">
        <Button disabled={pending}>{t("common.save")}</Button>
        {state?.ok && <span className="text-sm text-green-700">{t("common.saved")}</span>}
      </div>
    </form>
  );
}
