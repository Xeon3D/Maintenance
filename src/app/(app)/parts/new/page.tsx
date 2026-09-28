import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { PartForm } from "../part-form";

export default async function NewPartPage({ searchParams }: PageProps<"/parts/new">) {
  const ctx = await getContext();
  if (!ctx.can("inventory.manage")) notFound();
  const t = await getTranslations();
  const vendorId = sp(await searchParams, "vendorId");
  return (
    <>
      <BackLink href="/parts" label={t("nav.parts")} />
      <PageHeader title={t("parts.new")} />
      <Card className="max-w-3xl p-6">
        <PartForm ctx={ctx} defaults={{ vendorId }} />
      </Card>
    </>
  );
}
