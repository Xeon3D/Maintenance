import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { PMForm } from "../pm-form";

export default async function NewPMPage({ searchParams }: PageProps<"/preventive/new">) {
  const ctx = await getContext();
  if (!ctx.can("pm.manage")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const procedureId = sp(params, "procedureId");
  const assetId = sp(params, "assetId");
  const meterId = sp(params, "meterId");
  const [procedure, asset, meter] = await Promise.all([
    procedureId ? ctx.db.procedure.findUnique({ where: { id: procedureId }, select: { id: true, name: true, system: true } }) : null,
    assetId ? ctx.db.asset.findUnique({ where: { id: assetId }, select: { id: true, villaId: true, system: true, name: true } }) : null,
    meterId ? ctx.db.meter.findUnique({ where: { id: meterId }, select: { id: true, assetId: true, asset: { select: { villaId: true, system: true } } } }) : null,
  ]);
  // Default start: tomorrow 09:00 local-ish (the form converts in the browser).
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);

  return (
    <>
      <BackLink href="/preventive" label={t("nav.preventive")} />
      <PageHeader title={t("pm.new")} />
      <Card className="max-w-4xl p-6">
        <PMForm
          ctx={ctx}
          pm={{
            title: procedure?.name,
            procedureId: procedure?.id,
            system: procedure?.system ?? asset?.system ?? meter?.asset.system,
            villaId: asset?.villaId ?? meter?.asset.villaId ?? sp(params, "villaId"),
            assetId: asset?.id ?? meter?.assetId,
            trigger: meter ? "METER" : "TIME",
            meterId: meter?.id,
            startDate: start.toISOString(),
          }}
        />
      </Card>
    </>
  );
}
