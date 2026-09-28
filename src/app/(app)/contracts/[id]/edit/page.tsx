import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { ContractForm } from "../../contract-form";

export default async function EditContractPage({ params }: PageProps<"/contracts/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("contracts.manage")) notFound();
  const contract = await ctx.db.serviceContract.findUnique({ where: { id } });
  if (!contract) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/contracts/${id}`} label={contract.name} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-3xl p-6">
        <ContractForm ctx={ctx} contract={contract} />
      </Card>
    </>
  );
}
