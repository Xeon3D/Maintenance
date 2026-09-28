import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SystemType } from "@/generated/prisma/enums";
import type { Part } from "@/generated/prisma/client";
import type { AppContext } from "@/lib/context";
import { savePartAction } from "./actions";

export async function PartForm({ ctx, part, defaults }: { ctx: AppContext; part?: Part; defaults?: { vendorId?: string } }) {
  const t = await getTranslations();
  const [vendors, locations] = await Promise.all([
    ctx.db.vendor.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    part ? [] : ctx.db.stockLocation.findMany({ where: { archivedAt: null }, select: { id: true, name: true, type: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <ActionForm action={savePartAction.bind(null, part?.id ?? null)} submitLabel={part ? t("common.save") : t("common.create")}>
      <Field label={t("common.name")}>
        <Input name="name" defaultValue={part?.name} placeholder={t("parts.namePlaceholder")} required autoFocus />
        <FieldError name="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("parts.sku")}>
          <Input name="sku" defaultValue={part?.sku ?? ""} className="font-mono" />
        </Field>
        <Field label={t("parts.barcode")}>
          <Input name="barcode" defaultValue={part?.barcode ?? ""} className="font-mono" />
        </Field>
        <Field label={t("assets.system")}>
          <Select name="system" defaultValue={part?.system ?? ""}>
            <option value="">—</option>
            {Object.values(SystemType).map((s) => (
              <option key={s} value={s}>
                {t(`systems.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("assets.manufacturer")}>
          <Input name="manufacturer" defaultValue={part?.manufacturer ?? ""} />
        </Field>
        <Field label={t("assets.model")}>
          <Input name="model" defaultValue={part?.model ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label={t("parts.unit")} hint={t("parts.unitHint")}>
          <Input name="unit" defaultValue={part?.unit ?? "pcs"} required list="part-units" />
          <datalist id="part-units">
            {["pcs", "m", "box", "roll", "pack", "kg", "l"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <FieldError name="unit" />
        </Field>
        <Field label={t("parts.unitCost")}>
          <Input name="unitCost" type="number" step="0.01" min={0} defaultValue={part ? Number(part.unitCost) : ""} placeholder="0.00" />
          <FieldError name="unitCost" />
        </Field>
        <Field label={t("parts.minQuantity")} hint={t("parts.minQuantityHint")}>
          <Input name="minQuantity" type="number" step="any" min={0} defaultValue={part ? Number(part.minQuantity) : 0} />
          <FieldError name="minQuantity" />
        </Field>
        <Field label={t("parts.vendor")}>
          <Select name="vendorId" defaultValue={part?.vendorId ?? defaults?.vendorId ?? ""}>
            <option value="">—</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("wo.descriptionLabel")}>
        <Textarea name="description" defaultValue={part?.description ?? ""} className="min-h-16" />
      </Field>
      {!part && locations.length > 0 && (
        <div className="grid gap-4 rounded-md bg-gray-50 p-4 sm:grid-cols-2">
          <Field label={t("parts.openingQuantity")} hint={t("parts.openingHint")}>
            <Input name="openingQuantity" type="number" step="any" min={0} />
            <FieldError name="openingQuantity" />
          </Field>
          <Field label={t("stock.location")}>
            <Select name="openingLocationId" defaultValue={locations[0].id}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </ActionForm>
  );
}
