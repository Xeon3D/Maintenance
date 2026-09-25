import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  const ctx = await getContext();
  if (!ctx.can("clients.manage")) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/clients" label={t("nav.clients")} />
      <PageHeader title={t("clients.new")} />
      <Card className="max-w-3xl p-6">
        <ClientForm />
      </Card>
    </>
  );
}
