import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { VendorForm } from "../vendor-form";

export default async function NewVendorPage() {
  const ctx = await getContext();
  if (!ctx.can("vendors.manage")) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/vendors" label={t("nav.vendors")} />
      <PageHeader title={t("vendors.new")} />
      <Card className="max-w-3xl p-6">
        <VendorForm />
      </Card>
    </>
  );
}
