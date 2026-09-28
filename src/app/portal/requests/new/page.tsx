import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { sp } from "@/lib/list";
import { getPortalContext } from "@/lib/portal";
import { PortalRequestForm } from "./request-form";

export default async function NewPortalRequestPage({ searchParams }: PageProps<"/portal/requests/new">) {
  const ctx = await getPortalContext();
  const t = await getTranslations();
  const params = await searchParams;
  const villas = await ctx.db.villa.findMany({ where: ctx.villaWhere, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const villaIds = villas.map((v) => v.id);
  const [areas, assets] = await Promise.all([
    ctx.db.area.findMany({ where: { villaId: { in: villaIds } }, select: { id: true, name: true, villaId: true }, orderBy: { name: "asc" } }),
    ctx.db.asset.findMany({
      where: { villaId: { in: villaIds }, archivedAt: null },
      select: { id: true, name: true, villaId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  // Prefill from a QR scan (?assetId=) when the asset is on one of this client's villas.
  const asset = assets.find((a) => a.id === sp(params, "assetId"));

  return (
    <>
      <BackLink href="/portal" label={t("portal.title")} />
      <h1 className="mb-1 text-xl font-semibold">{t("portal.newRequest")}</h1>
      <p className="mb-5 text-sm text-muted">{t("portal.newRequestHint")}</p>
      <Card className="p-5 sm:p-6">
        <PortalRequestForm villas={villas} areas={areas} assets={assets} defaults={{ villaId: asset?.villaId ?? sp(params, "villaId"), assetId: asset?.id }} />
      </Card>
    </>
  );
}
