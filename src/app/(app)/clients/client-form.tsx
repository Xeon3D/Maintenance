import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { ClientType } from "@/generated/prisma/enums";
import type { Client } from "@/generated/prisma/client";
import { saveClientAction } from "./actions";

export async function ClientForm({ client }: { client?: Client }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveClientAction.bind(null, client?.id ?? null)} submitLabel={client ? t("common.save") : t("common.create")}>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label={t("common.name")}>
          <Input name="name" defaultValue={client?.name} required autoFocus />
          <FieldError name="name" />
        </Field>
        <Field label={t("clients.type")}>
          <Select name="type" defaultValue={client?.type ?? "PRIVATE_OWNER"}>
            {Object.values(ClientType).map((v) => (
              <option key={v} value={v}>
                {t(`clientType.${v}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("common.email")}>
          <Input name="email" type="email" defaultValue={client?.email ?? ""} />
          <FieldError name="email" />
        </Field>
        <Field label={t("common.phone")}>
          <Input name="phone" type="tel" defaultValue={client?.phone ?? ""} />
        </Field>
        <Field label={t("clients.taxId")}>
          <Input name="taxId" defaultValue={client?.taxId ?? ""} />
        </Field>
      </div>
      <Field label={t("clients.billingAddress")}>
        <Textarea name="billingAddress" defaultValue={client?.billingAddress ?? ""} className="min-h-16" />
      </Field>
      <Field label={t("common.notes")}>
        <Textarea name="notes" defaultValue={client?.notes ?? ""} />
      </Field>
    </ActionForm>
  );
}
