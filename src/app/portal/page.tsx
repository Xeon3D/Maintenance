import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, House } from "lucide-react";
import { Card } from "@/components/ui";
import { getPortalContext } from "@/lib/portal";
import { ACTIVE_STATUSES } from "@/lib/work-orders";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("portal.title");

/** The client's properties, and nothing else: everything else starts from a property. */
export default async function PortalHome() {
  const ctx = await getPortalContext();
  const t = await getTranslations();

  const villas = await ctx.db.villa.findMany({
    where: ctx.villaWhere,
    include: { _count: { select: { workOrders: { where: { ...ctx.workOrderWhere, status: { in: ACTIVE_STATUSES } } } } } },
    orderBy: { name: "asc" },
  });

  if (villas.length === 0) {
    return <Card className="p-6 text-sm text-muted">{t("portal.noVillas")}</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("dashboard.greeting", { name: ctx.user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-sm text-muted">{t("portal.pickVilla")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("portal.yourVillas")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {villas.map((v) => (
            <Link key={v.id} href={`/portal/villas/${v.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 hover:border-brand/40">
                <span className="flex items-center gap-3">
                  <House className="size-5 text-muted" />
                  <span>
                    <span className="block font-medium">{v.name}</span>
                    <span className="text-xs text-muted">
                      {v._count.workOrders ? t("portal.inProgress", { count: v._count.workOrders }) : t("portal.allGood")}
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
