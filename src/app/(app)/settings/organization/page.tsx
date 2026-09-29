import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm, FieldError } from "@/components/action-form";
import { getContext } from "@/lib/context";
import { brandColor, DEFAULT_BRAND, logoSrc } from "@/lib/branding";
import { factoryResetEnabled } from "@/lib/factory-reset";
import { updateOrgAction } from "../actions";
import { BrandColorField, LogoUploader } from "./form";

export const metadata = { title: "Organization" };

const TIMEZONES = ["Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores", "Europe/London", "Europe/Madrid", "Europe/Paris", "Asia/Dubai", "America/Sao_Paulo", "America/New_York", "UTC"];
const CURRENCIES = ["EUR", "GBP", "USD", "AED", "BRL", "CHF"];

export default async function OrgSettingsPage() {
  const ctx = await getContext();
  if (!ctx.can("org.manage")) notFound();
  const t = await getTranslations();
  const o = ctx.organization;

  return (
    <>
      <PageHeader title={t("settings.orgTitle")} description={t("settings.orgDescription")} />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <ActionForm action={updateOrgAction} successMessage={t("common.saved")}>
            <h2 className="font-medium">{t("company.details")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("company.name")} hint={t("company.nameHint")}>
                <Input name="name" defaultValue={o.name} required maxLength={100} />
                <FieldError name="name" />
              </Field>
              <Field label={t("company.legalName")} hint={t("company.legalNameHint")}>
                <Input name="legalName" defaultValue={o.legalName ?? ""} maxLength={200} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("company.taxId")}>
                <Input name="taxId" defaultValue={o.taxId ?? ""} maxLength={40} />
              </Field>
              <Field label={t("common.phone")}>
                <Input name="phone" type="tel" defaultValue={o.phone ?? ""} maxLength={50} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("common.email")}>
                <Input name="email" type="email" defaultValue={o.email ?? ""} maxLength={200} />
                <FieldError name="email" />
              </Field>
              <Field label={t("vendors.website")}>
                <Input name="website" type="url" placeholder="https://" defaultValue={o.website ?? ""} maxLength={300} />
                <FieldError name="website" />
              </Field>
            </div>
            <Field label={t("vendors.address")}>
              <Textarea name="address" defaultValue={o.address ?? ""} className="min-h-20" maxLength={500} />
            </Field>

            <h2 className="border-t border-border pt-5 font-medium">{t("company.branding")}</h2>
            <BrandColorField defaultValue={o.brandColor ?? ""} fallback={DEFAULT_BRAND} />

            <h2 className="border-t border-border pt-5 font-medium">{t("company.documents")}</h2>
            <Field label={t("company.reportFooter")} hint={t("company.reportFooterHint")}>
              <Textarea name="reportFooter" defaultValue={o.reportFooter ?? ""} className="min-h-16" maxLength={500} />
            </Field>

            <h2 className="border-t border-border pt-5 font-medium">{t("company.regional")}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("settings.timezone")}>
                <Select name="timezone" defaultValue={o.timezone}>
                  {(TIMEZONES.includes(o.timezone) ? TIMEZONES : [o.timezone, ...TIMEZONES]).map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("settings.currency")}>
                <Select name="currency" defaultValue={o.currency}>
                  {(CURRENCIES.includes(o.currency) ? CURRENCIES : [o.currency, ...CURRENCIES]).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("settings.defaultLanguage")}>
                <Select name="defaultLocale" defaultValue={o.defaultLocale}>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </Select>
              </Field>
            </div>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-1 font-medium">{t("company.logo")}</h2>
            <p className="mb-3 text-xs text-muted">{t("company.logoHint")}</p>
            <LogoUploader src={logoSrc(o)} name={o.name} color={brandColor(o)} />
          </Card>
          {factoryResetEnabled() && (
            <Card className="border-red-200 p-5">
              <h2 className="mb-1 font-medium text-danger">{t("auth.factoryResetTitle")}</h2>
              <p className="mb-3 text-xs text-muted">{t("auth.factoryResetBody")}</p>
              <Link href="/factory-reset" className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-danger hover:bg-red-50">
                {t("auth.factoryResetButton")}
              </Link>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
