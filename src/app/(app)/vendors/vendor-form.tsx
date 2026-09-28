import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SystemType, VendorType } from "@/generated/prisma/enums";
import type { Vendor } from "@/generated/prisma/client";
import { saveVendorAction } from "./actions";

export async function VendorForm({ vendor }: { vendor?: Vendor }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveVendorAction.bind(null, vendor?.id ?? null)} submitLabel={vendor ? t("common.save") : t("common.create")}>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label={t("common.name")}>
          <Input name="name" defaultValue={vendor?.name} required autoFocus />
          <FieldError name="name" />
        </Field>
        <Field label={t("vendors.type")}>
          <Select name="type" defaultValue={vendor?.type ?? "SUPPLIER"}>
            {Object.values(VendorType).map((v) => (
              <option key={v} value={v}>
                {t(`vendorType.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("common.email")}>
          <Input name="email" type="email" defaultValue={vendor?.email ?? ""} />
          <FieldError name="email" />
        </Field>
        <Field label={t("common.phone")}>
          <Input name="phone" type="tel" defaultValue={vendor?.phone ?? ""} />
        </Field>
        <Field label={t("clients.taxId")}>
          <Input name="taxId" defaultValue={vendor?.taxId ?? ""} />
        </Field>
      </div>
      <Field label={t("vendors.website")}>
        <Input name="website" type="url" placeholder="https://" defaultValue={vendor?.website ?? ""} />
        <FieldError name="website" />
      </Field>
      <Field label={t("vendors.address")}>
        <Textarea name="address" defaultValue={vendor?.address ?? ""} className="min-h-16" />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("vendors.systems")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.values(SystemType).map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="systems" value={s} defaultChecked={vendor?.systems.includes(s)} className="size-4 accent-brand" />
              {t(`systems.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("common.notes")}>
        <Textarea name="notes" defaultValue={vendor?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}
