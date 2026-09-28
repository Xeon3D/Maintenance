import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { PMForm } from "../../pm-form";

export default async function EditPMPage({ params }: PageProps<"/preventive/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("pm.manage")) notFound();
  const s = await ctx.db.pMSchedule.findUnique({ where: { id }, include: { assignees: true } });
  if (!s) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/preventive/${id}`} label={s.title} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-4xl p-6">
        <PMForm
          ctx={ctx}
          id={s.id}
          pm={{
            ...s,
            startDate: s.startDate?.toISOString(),
            endDate: s.endDate?.toISOString(),
            assigneeIds: s.assignees.map((a) => a.userId),
          }}
        />
      </Card>
    </>
  );
}
