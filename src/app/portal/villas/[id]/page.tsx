import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClipboardList, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getPortalContext } from "@/lib/portal";

/** A property: two choices, report something new or look at what was asked and done before. */
export default async function PortalVillaPage({ params }: PageProps<"/portal/villas/[id]">) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const t = await getTranslations();

  const villa = await ctx.db.villa.findFirst({ where: { id, ...ctx.villaWhere }, select: { id: true, name: true, city: true } });
  if (!villa) notFound();

  const choice = "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors hover:border-brand/50 hover:bg-brand/5";
  return (
    <>
      <BackLink href="/portal" label={t("portal.yourVillas")} />
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{villa.name}</h1>
        {villa.city && <p className="text-sm text-muted">{villa.city}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/portal/requests/new?villaId=${villa.id}`}>
          <Card className={choice}>
            <span className="flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Plus className="size-6" />
            </span>
            <span className="text-lg font-medium">{t("portal.newRequest")}</span>
            <span className="text-sm text-muted">{t("portal.newRequestHint")}</span>
          </Card>
        </Link>
        <Link href={`/portal/villas/${villa.id}/requests`}>
          <Card className={choice}>
            <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ClipboardList className="size-6" />
            </span>
            <span className="text-lg font-medium">{t("portal.pastRequests")}</span>
            <span className="text-sm text-muted">{t("portal.pastRequestsHint")}</span>
          </Card>
        </Link>
      </div>
    </>
  );
}
