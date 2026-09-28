import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ChevronRight, FileDown, House } from "lucide-react";
import { Card } from "@/components/ui";
import { WorkOrderStatusBadge } from "@/components/badges";
import { RequestStatusBadge } from "@/components/request-badge";
import { getPortalContext } from "@/lib/portal";
import { ACTIVE_STATUSES } from "@/lib/work-orders";

export const metadata = { title: "Portal" };

export default async function PortalHome() {
  const ctx = await getPortalContext();
  const t = await getTranslations();
  const format = await getFormatter();

  const [villas, requests, done] = await Promise.all([
    ctx.db.villa.findMany({
      where: ctx.villaWhere,
      include: { _count: { select: { workOrders: { where: { ...ctx.workOrderWhere, status: { in: ACTIVE_STATUSES } } } } } },
      orderBy: { name: "asc" },
    }),
    ctx.db.request.findMany({
      where: ctx.requestWhere,
      include: { villa: { select: { name: true } }, workOrder: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    ctx.db.workOrder.findMany({
      where: { ...ctx.workOrderWhere, status: "DONE" },
      select: { id: true, number: true, title: true, completedAt: true, villa: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
  ]);

  if (villas.length === 0) {
    return <Card className="p-6 text-sm text-muted">{t("portal.noVillas")}</Card>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{t("dashboard.greeting", { name: ctx.user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-sm text-muted">{t("portal.subtitle")}</p>
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("portal.yourRequests")}</h2>
        {requests.length === 0 ? (
          <Card className="p-5 text-sm text-muted">{t("portal.noRequests")}</Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/portal/requests/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="text-xs text-muted">
                        R{r.number} · {r.villa?.name} · {format.relativeTime(r.createdAt)}
                      </span>
                    </span>
                    {r.workOrder ? <WorkOrderStatusBadge status={r.workOrder.status} /> : <RequestStatusBadge status={r.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("portal.recentWork")}</h2>
          <Card>
            <ul className="divide-y divide-border">
              {done.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{w.title}</span>
                    <span className="text-xs text-muted">
                      {w.villa?.name} · {w.completedAt && format.dateTime(w.completedAt, { dateStyle: "medium" })}
                    </span>
                  </span>
                  <Link href={`/work-orders/${w.id}/report`} prefetch={false} target="_blank" className="inline-flex shrink-0 items-center gap-1 text-brand">
                    <FileDown className="size-4" />
                    {t("portal.report")}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
