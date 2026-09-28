import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { ProcedureEditor } from "../editor";

export default async function NewProcedurePage() {
  const ctx = await getContext();
  if (!ctx.can("procedures.manage")) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/procedures" label={t("nav.procedures")} />
      <PageHeader title={t("procedures.new")} />
      <Card className="max-w-4xl p-6">
        <ProcedureEditor id={null} />
      </Card>
    </>
  );
}
