import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { PartForm } from "../../part-form";

export default async function EditPartPage({ params }: PageProps<"/parts/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("inventory.manage")) notFound();
  const part = await ctx.db.part.findUnique({ where: { id } });
  if (!part) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/parts/${id}`} label={part.name} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-3xl p-6">
        <PartForm ctx={ctx} part={part} />
      </Card>
    </>
  );
}
