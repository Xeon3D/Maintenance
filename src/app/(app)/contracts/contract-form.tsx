import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { ContractStatus, SystemType } from "@/generated/prisma/enums";
import type { ServiceContract } from "@/generated/prisma/client";
import type { AppContext } from "@/lib/context";
import { dateInput } from "@/lib/forms";
import { saveContractAction } from "./actions";

export async function ContractForm({ ctx, contract, defaults }: { ctx: AppContext; contract?: ServiceContract; defaults?: { clientId?: string } }) {
  const t = await getTranslations();
  const clients = await ctx.db.client.findMany({
    where: { OR: [{ archivedAt: null }, { id: contract?.clientId ?? "" }] },
    select: { id: true, name: true, villas: { where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <ActionForm action={saveContractAction.bind(null, contract?.id ?? null)} submitLabel={contract ? t("common.save") : t("common.create")}>
      <Field label={t("common.name")}>
        <Input name="name" defaultValue={contract?.name} placeholder={t("contracts.namePlaceholder")} required autoFocus />
        <FieldError name="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("villas.client")}>
          <Select name="clientId" defaultValue={contract?.clientId ?? defaults?.clientId ?? ""} required>
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
        <Field label={t("assets.villa")} hint={t("contracts.villaHint")}>
          <Select name="villaId" defaultValue={contract?.villaId ?? ""}>
            <option value="">{t("contracts.allVillas")}</option>
            {clients
              .filter((c) => c.villas.length > 0)
              .map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.villas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </Select>
          <FieldError name="villaId" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("common.status")}>
          <Select name="status" defaultValue={contract?.status ?? "ACTIVE"}>
            {Object.values(ContractStatus).map((s) => (
              <option key={s} value={s}>
                {t(`contractStatus.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("contracts.startDate")}>
          <Input name="startDate" type="date" defaultValue={dateInput(contract?.startDate ?? new Date())} required />
          <FieldError name="startDate" />
        </Field>
        <Field label={t("contracts.endDate")} hint={t("contracts.endDateHint")}>
          <Input name="endDate" type="date" defaultValue={dateInput(contract?.endDate)} />
          <FieldError name="endDate" />
        </Field>
      </div>

      <fieldset className="rounded-md bg-gray-50 p-4">
        <legend className="mb-2 px-1 text-sm font-medium">{t("contracts.sla")}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("contracts.responseHours")} hint={t("contracts.responseHint")}>
            <Input name="responseTimeHours" type="number" min={1} step={1} defaultValue={contract?.responseTimeHours ?? ""} />
            <FieldError name="responseTimeHours" />
          </Field>
          <Field label={t("contracts.resolutionHours")} hint={t("contracts.resolutionHint")}>
            <Input name="resolutionTimeHours" type="number" min={1} step={1} defaultValue={contract?.resolutionTimeHours ?? ""} />
            <FieldError name="resolutionTimeHours" />
          </Field>
          <Field label={t("contracts.includedVisits")} hint={t("contracts.includedVisitsHint")}>
            <Input name="includedVisits" type="number" min={0} step={1} defaultValue={contract?.includedVisits ?? ""} />
            <FieldError name="includedVisits" />
          </Field>
        </div>
      </fieldset>

      <Field label={t("contracts.monthlyFee")}>
        <Input name="monthlyFee" type="number" min={0} step="0.01" defaultValue={contract?.monthlyFee != null ? Number(contract.monthlyFee) : ""} className="sm:max-w-48" />
        <FieldError name="monthlyFee" />
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t("contracts.systems")}</legend>
        <p className="mb-2 text-xs text-muted">{t("contracts.systemsHint")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.values(SystemType).map((s) => (
            <label key={s} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="systems" value={s} defaultChecked={contract?.systems.includes(s)} className="size-4 accent-brand" />
              {t(`systems.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={t("common.notes")}>
        <Textarea name="notes" defaultValue={contract?.notes ?? ""} placeholder={t("contracts.notesPlaceholder")} />
      </Field>
    </ActionForm>
  );
}
