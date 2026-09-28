import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { FileDown, Plus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { AssetStatusBadge, SystemBadge, WorkOrderStatusBadge } from "@/components/badges";
import { getPortalContext } from "@/lib/portal";
import type { SystemType } from "@/generated/prisma/enums";

export default async function PortalVillaPage({ params }: PageProps<"/portal/villas/[id]">) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const t = await getTranslations();
  const format = await getFormatter();

  // Only non-sensitive fields: no access codes, IPs, credentials or internal notes.
  const villa = await ctx.db.villa.findFirst({
    where: { id, ...ctx.villaWhere },
    select: {
      id: true,
      name: true,
      city: true,
      assets: { where: { archivedAt: null }, select: { id: true, name: true, system: true, status: true, area: { select: { name: true } } }, orderBy: { name: "asc" } },
    },
  });
  if (!villa) notFound();

  const history = await ctx.db.workOrder.findMany({
    where: { ...ctx.workOrderWhere, villaId: villa.id },
    select: { id: true, number: true, title: true, status: true, type: true, dueDate: true, completedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const bySystem = new Map<SystemType, typeof villa.assets>();
  for (const a of villa.assets) bySystem.set(a.system, [...(bySystem.get(a.system) ?? []), a]);

  return (
    <>
      <BackLink href="/portal" label={t("portal.title")} />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{villa.name}</h1>
          {villa.city && <p className="text-sm text-muted">{villa.city}</p>}
        </div>
        <Link href={`/portal/requests/new?villaId=${villa.id}`}>
          <Button>
            <Plus className="size-4" />
            {t("portal.newRequest")}
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="border-b border-border px-5 py-3 font-medium">{t("portal.workHistory")}</h2>
          {history.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">{t("wo.noneHere")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{w.title}</span>
                    <span className="text-xs text-muted">
                      {t(`woType.${w.type}`)} · {format.dateTime(w.completedAt ?? w.dueDate ?? w.createdAt, { dateStyle: "medium" })}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {w.status === "DONE" && (
                      <Link href={`/work-orders/${w.id}/report`} prefetch={false} target="_blank" className="text-brand" title={t("portal.downloadReport")}>
                        <FileDown className="size-4" />
                      </Link>
                    )}
                    <WorkOrderStatusBadge status={w.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="border-b border-border px-5 py-3 font-medium">{t("portal.installedSystems")}</h2>
          {bySystem.size === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">—</p>
          ) : (
            <div className="divide-y divide-border">
              {[...bySystem.entries()].map(([system, list]) => (
                <div key={system} className="px-5 py-3">
                  <SystemBadge system={system} />
                  <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {a.name}
                          {a.area && <span className="ml-1.5 text-xs text-muted">· {a.area.name}</span>}
                        </span>
                        {a.status !== "OPERATIONAL" && <AssetStatusBadge status={a.status} />}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
