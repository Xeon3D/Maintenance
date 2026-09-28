import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { VendorForm } from "../../vendor-form";

export default async function EditVendorPage({ params }: PageProps<"/vendors/[id]/edit">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("vendors.manage")) notFound();
  const vendor = await ctx.db.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();
  const t = await getTranslations();
  return (
    <>
      <BackLink href={`/vendors/${id}`} label={vendor.name} />
      <PageHeader title={t("common.edit")} />
      <Card className="max-w-3xl p-6">
        <VendorForm vendor={vendor} />
      </Card>
    </>
  );
}
