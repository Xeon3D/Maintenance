import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { ContractForm } from "../contract-form";

export default async function NewContractPage({ searchParams }: PageProps<"/contracts/new">) {
  const ctx = await getContext();
  if (!ctx.can("contracts.manage")) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/contracts" label={t("nav.contracts")} />
      <PageHeader title={t("contracts.new")} />
      <Card className="max-w-3xl p-6">
        <ContractForm ctx={ctx} defaults={{ clientId: sp(await searchParams, "clientId") }} />
      </Card>
    </>
  );
}
