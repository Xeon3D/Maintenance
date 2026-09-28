import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { WorkOrderForm } from "../wo-form";

export default async function NewWorkOrderPage({ searchParams }: PageProps<"/work-orders/new">) {
  const ctx = await getContext();
  if (!ctx.can("workOrders.create")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  // Prefill from an asset or villa page ("Create work order" buttons).
  const assetId = sp(params, "assetId");
  const asset = assetId
    ? await ctx.db.asset.findUnique({ where: { id: assetId }, select: { id: true, villaId: true, areaId: true, system: true } })
    : null;

  return (
    <>
      <BackLink href="/work-orders" label={t("nav.workOrders")} />
      <PageHeader title={t("wo.new")} />
      <Card className="max-w-4xl p-6">
        <WorkOrderForm
          ctx={ctx}
          wo={{
            villaId: asset?.villaId ?? sp(params, "villaId"),
            areaId: asset?.areaId,
            assetId: asset?.id,
            system: asset?.system,
            assigneeIds: ctx.role === "TECHNICIAN" ? [ctx.user.id] : [],
          }}
        />
      </Card>
    </>
  );
}
