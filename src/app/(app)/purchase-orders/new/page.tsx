import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { PoForm } from "../po-form";
import Link from "next/link";

export default async function NewPurchaseOrderPage({ searchParams }: PageProps<"/purchase-orders/new">) {
  const ctx = await getContext();
  if (!ctx.can("purchasing.manage")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const hasVendor = await ctx.db.vendor.count({ where: { archivedAt: null } });
  return (
    <>
      <BackLink href="/purchase-orders" label={t("nav.purchaseOrders")} />
      <PageHeader title={t("po.new")} />
      {hasVendor ? (
        <Card className="max-w-3xl p-6">
          <PoForm ctx={ctx} defaults={{ vendorId: sp(params, "vendorId"), workOrderId: sp(params, "workOrderId") }} />
        </Card>
      ) : (
        <EmptyState
          title={t("po.needVendor")}
          action={
            <Link href="/vendors/new" className="text-sm font-medium text-brand">
              {t("vendors.new")}
            </Link>
          }
        />
      )}
    </>
  );
}
