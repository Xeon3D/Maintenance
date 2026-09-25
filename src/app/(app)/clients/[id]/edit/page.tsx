import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("clients.manage")) notFound();
  const client = await ctx.db.client.findUnique({ where: { id } });
  if (!client) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/clients/${id}`} label={client.name} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-3xl p-6">
        <ClientForm client={client} />
      </Card>
    </>
  );
}
