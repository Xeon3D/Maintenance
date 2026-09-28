import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { PurchaseOrder } from "@/generated/prisma/client";
import type { AppContext } from "@/lib/context";
import { dateInput } from "@/lib/forms";
import { ACTIVE_STATUSES } from "@/lib/work-orders";
import { savePoAction } from "./actions";

export async function PoForm({
  ctx,
  po,
  defaults,
}: {
  ctx: AppContext;
  po?: PurchaseOrder;
  defaults?: { vendorId?: string; workOrderId?: string };
}) {
  const t = await getTranslations();
  const [vendors, locations, workOrders] = await Promise.all([
    ctx.db.vendor.findMany({
      where: { OR: [{ archivedAt: null }, { id: po?.vendorId ?? "" }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    ctx.db.stockLocation.findMany({ where: { archivedAt: null }, select: { id: true, name: true, type: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    ctx.db.workOrder.findMany({
      where: { OR: [{ status: { in: ACTIVE_STATUSES } }, { id: po?.workOrderId ?? defaults?.workOrderId ?? "" }] },
      select: { id: true, number: true, title: true },
      orderBy: { number: "desc" },
      take: 200,
    }),
  ]);

  return (
    <ActionForm action={savePoAction.bind(null, po?.id ?? null)} submitLabel={po ? t("common.save") : t("common.create")} successMessage={t("common.saved")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("po.vendor")}>
          <Select name="vendorId" defaultValue={po?.vendorId ?? defaults?.vendorId ?? ""} required>
            <option value="" disabled>
              —
            </option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <FieldError name="vendorId" />
        </Field>
        <Field label={t("po.shipTo")}>
          <Select name="shipToLocationId" defaultValue={po ? (po.shipToLocationId ?? "") : (locations.find((l) => l.type === "WAREHOUSE")?.id ?? "")}>
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("po.expectedDate")}>
          <Input name="expectedDate" type="date" defaultValue={dateInput(po?.expectedDate)} />
        </Field>
        <Field label={t("po.workOrder")} hint={t("po.workOrderHint")}>
          <Select name="workOrderId" defaultValue={po?.workOrderId ?? defaults?.workOrderId ?? ""}>
            <option value="">—</option>
            {workOrders.map((w) => (
              <option key={w.id} value={w.id}>
                #{w.number} · {w.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("po.tax")}>
          <Input name="tax" type="number" step="0.01" min={0} defaultValue={po ? Number(po.tax) : 0} />
          <FieldError name="tax" />
        </Field>
        <Field label={t("po.shipping")}>
          <Input name="shipping" type="number" step="0.01" min={0} defaultValue={po ? Number(po.shipping) : 0} />
          <FieldError name="shipping" />
        </Field>
      </div>
      <Field label={t("common.notes")} hint={t("po.notesHint")}>
        <Textarea name="notes" defaultValue={po?.notes ?? ""} className="min-h-16" />
      </Field>
      {!po && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="lowStock" className="size-4 accent-brand" />
          {t("po.prefillLowStock")}
        </label>
      )}
    </ActionForm>
  );
}
