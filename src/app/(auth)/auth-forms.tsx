"use client";

import Link from "next/link";
import { useActionForm } from "@/lib/use-action-form";
import { useTranslations } from "next-intl";
import { Button, Card, Field, FormError, Input } from "@/components/ui";
import { loginAction, requestResetAction, resetPasswordAction, signupAction, type FormState } from "./actions";

function useErrorText(state: FormState) {
  const t = useTranslations();
  if (!state?.error) return null;
  return t.has(`auth.${state.error}`) ? t(`auth.${state.error}`) : t("common.somethingWrong");
}

export function LoginForm({ next, reset }: { next?: string; reset?: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionForm(loginAction);
  const error = useErrorText(state);
  return (
    <Card className="p-6">
      <h1 className="mb-5 text-lg font-semibold">{t("signInTitle")}</h1>
      {reset && <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{t("resetDone")}</p>}
      <form onSubmit={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t("email")}>
          <Input name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label={t("password")}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <p className="-mt-2 text-right text-xs">
          <Link href="/forgot-password" className="text-muted hover:text-brand">
            {t("forgot")}
          </Link>
        </p>
        <FormError message={error} />
        <Button className="w-full" disabled={pending}>
          {t("signIn")}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-brand">
          {t("signUp")}
        </Link>
      </p>
    </Card>
  );
}

/** `withCompany` = owner sign-up; false when joining through an invitation. */
export function SignupForm({ next, withCompany, email }: { next?: string; withCompany: boolean; email?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionForm(signupAction);
  const error = useErrorText(state);
  return (
    <Card className="p-6">
      <h1 className="mb-5 text-lg font-semibold">{withCompany ? t("signUpTitle") : t("signUp")}</h1>
      <form onSubmit={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        {withCompany && (
          <Field label={t("companyName")}>
            <Input name="company" required autoFocus />
          </Field>
        )}
        <Field label={t("name")}>
          <Input name="name" autoComplete="name" required autoFocus={!withCompany} />
        </Field>
        <Field label={t("email")}>
          <Input name="email" type="email" autoComplete="email" required defaultValue={email} readOnly={!!email} />
        </Field>
        <Field label={t("password")} hint={t("passwordRule")}>
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <FormError message={error} />
        <Button className="w-full" disabled={pending}>
          {t("signUp")}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-brand">
          {t("signIn")}
        </Link>
      </p>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionForm(requestResetAction);
  const error = useErrorText(state);
  return (
    <Card className="p-6">
      <h1 className="mb-2 text-lg font-semibold">{t("forgotTitle")}</h1>
      {state?.sent ? (
        <p className="text-sm text-muted">{t("resetSent")}</p>
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">{t("forgotHint")}</p>
          <form onSubmit={action} className="space-y-4">
            <Field label={t("email")}>
              <Input name="email" type="email" autoComplete="email" required autoFocus />
            </Field>
            <FormError message={error} />
            <Button className="w-full" disabled={pending}>
              {t("sendReset")}
            </Button>
          </form>
        </>
      )}
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-medium text-brand">
          {t("backToSignIn")}
        </Link>
      </p>
    </Card>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionForm(resetPasswordAction);
  const error = useErrorText(state);
  return (
    <Card className="p-6">
      <h1 className="mb-2 text-lg font-semibold">{t("resetTitle")}</h1>
      <p className="mb-5 text-sm text-muted">{email}</p>
      <form onSubmit={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label={t("newPassword")} hint={t("passwordRule")}>
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
        </Field>
        <Field label={t("confirmPassword")}>
          <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <FormError message={error} />
        <Button className="w-full" disabled={pending}>
          {t("resetSubmit")}
        </Button>
      </form>
    </Card>
  );
}
