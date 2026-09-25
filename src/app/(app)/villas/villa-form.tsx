import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { Villa } from "@/generated/prisma/client";
import { saveVillaAction } from "./actions";

export async function VillaForm({
  villa,
  clients,
  defaultClientId,
}: {
  villa?: Villa;
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveVillaAction.bind(null, villa?.id ?? null)} submitLabel={villa ? t("common.save") : t("common.create")}>
      <Field label={t("villas.client")}>
        <Select name="clientId" defaultValue={villa?.clientId ?? defaultClientId ?? ""} required>
          <option value="" disabled>
            —
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <FieldError name="clientId" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Field label={t("common.name")}>
          <Input name="name" defaultValue={villa?.name} required />
          <FieldError name="name" />
        </Field>
        <Field label={t("villas.code")} hint={t("villas.codeHint")}>
          <Input name="code" defaultValue={villa?.code ?? ""} className="font-mono" />
        </Field>
      </div>
      <Field label={t("villas.address")}>
        <Input name="address" defaultValue={villa?.address ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("villas.city")}>
          <Input name="city" defaultValue={villa?.city ?? ""} />
        </Field>
        <Field label={t("villas.country")}>
          <Input name="country" defaultValue={villa?.country ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("villas.latitude")}>
          <Input name="latitude" inputMode="decimal" defaultValue={villa?.latitude ?? ""} placeholder="37.0412" />
          <FieldError name="latitude" />
        </Field>
        <Field label={t("villas.longitude")}>
          <Input name="longitude" inputMode="decimal" defaultValue={villa?.longitude ?? ""} placeholder="-8.0021" />
          <FieldError name="longitude" />
        </Field>
      </div>
      <Field label={t("villas.accessNotes")} hint={t("villas.accessNotesHint")}>
        <Textarea name="accessNotes" defaultValue={villa?.accessNotes ?? ""} />
      </Field>
    </ActionForm>
  );
}
