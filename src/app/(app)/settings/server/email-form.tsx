"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { FieldError, FieldErrorsProvider } from "@/components/action-form";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { useActionForm } from "@/lib/use-action-form";
import type { EmailProvider, SmtpSecurity } from "@/lib/email-settings";
import { saveEmailAction } from "./actions";

export type EmailFormValues = {
  provider: EmailProvider;
  from: string;
  smtp: { host: string; port: number; security: SmtpSecurity; user: string; hasPassword: boolean };
  hasResendKey: boolean;
  envResend: boolean;
};

/** Settings → Server → E-mail: SMTP, Resend, or the environment variables; save, or send a test first. */
export function EmailForm({ values, userEmail }: { values: EmailFormValues; userEmail: string }) {
  const t = useTranslations("server.email");
  const tr = useTranslations();
  const [provider, setProvider] = useState<EmailProvider>(values.provider);
  const [state, submit, pending] = useActionForm(saveEmailAction);
  const error = state?.error && state.error !== "validation" ? (tr.has(state.error) ? tr(state.error) : tr("common.somethingWrong")) : null;

  return (
    <FieldErrorsProvider errors={state?.fieldErrors}>
      <form method="post" onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("provider")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["smtp", "resend", "env"] as const).map((p) => (
              <label key={p} className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${provider === p ? "border-brand bg-brand/5" : "border-border"}`}>
                <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} className="mt-0.5 accent-brand" />
                <span>
                  <span className="block font-medium">{t(`providers.${p}`)}</span>
                  <span className="block text-xs text-muted">{t(`providerHints.${p}`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {provider !== "env" && (
          <Field label={t("from")} hint={t("fromHint")}>
            <Input name="from" defaultValue={values.from} placeholder="Manutenção <manutencao@empresa.pt>" maxLength={300} />
            <FieldError name="from" />
          </Field>
        )}

        {provider === "smtp" && (
          <div className="space-y-4 rounded-md bg-gray-50 p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_110px_160px]">
              <Field label={t("smtpHost")}>
                <Input name="smtpHost" defaultValue={values.smtp.host} placeholder="smtp.office365.com" maxLength={255} />
                <FieldError name="smtpHost" />
              </Field>
              <Field label={t("smtpPort")}>
                <Input name="smtpPort" type="number" min={1} max={65535} defaultValue={values.smtp.port} />
                <FieldError name="smtpPort" />
              </Field>
              <Field label={t("smtpSecurity")}>
                <Select name="smtpSecurity" defaultValue={values.smtp.security}>
                  <option value="starttls">{t("security.starttls")}</option>
                  <option value="ssl">{t("security.ssl")}</option>
                  <option value="none">{t("security.none")}</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("smtpUser")}>
                <Input name="smtpUser" defaultValue={values.smtp.user} autoComplete="off" maxLength={300} />
              </Field>
              <Field label={t("smtpPassword")} hint={values.smtp.hasPassword ? t("secretSaved") : t("secretHint")}>
                <Input name="smtpPassword" type="password" autoComplete="new-password" placeholder={values.smtp.hasPassword ? "••••••••" : ""} />
                {values.smtp.hasPassword && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" name="smtpPasswordClear" className="size-3.5" />
                    {t("clearPassword")}
                  </label>
                )}
              </Field>
            </div>
            <p className="text-xs text-muted">{t("smtpTips")}</p>
          </div>
        )}

        {provider === "resend" && (
          <div className="rounded-md bg-gray-50 p-4">
            <Field label={t("resendKey")} hint={values.hasResendKey ? t("secretSaved") : t("resendHint")}>
              <Input name="resendKey" type="password" autoComplete="off" placeholder={values.hasResendKey ? "••••••••" : "re_…"} />
              <FieldError name="resendKey" />
            </Field>
          </div>
        )}

        {provider === "env" && <p className="text-sm text-muted">{values.envResend ? t("envActive") : t("envNone")}</p>}

        <FormError message={error && state?.detail ? `${error} ${state.detail}` : error} />
        <div className="flex flex-wrap items-end gap-3">
          <Button disabled={pending}>{tr("common.save")}</Button>
          {state?.ok && !state.tested && <span className="text-sm text-green-700">{tr("common.saved")}</span>}
        </div>

        {provider !== "env" && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <Field label={t("testTo")} hint={t("testHint")}>
              <Input name="testTo" type="email" defaultValue={userEmail} className="w-72 max-w-full" />
              <FieldError name="testTo" />
            </Field>
            <Button type="submit" name="intent" value="test" variant="secondary" disabled={pending}>
              <Send className="size-4" />
              {pending ? t("testing") : t("test")}
            </Button>
            {state?.tested && <span className="pb-2 text-sm text-green-700">{t("testSent", { to: state.tested })}</span>}
          </div>
        )}
      </form>
    </FieldErrorsProvider>
  );
}
