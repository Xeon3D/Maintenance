import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CircleCheck, Circle } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/context";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getContext();
  const t = await getTranslations("dashboard");
  const { db } = ctx;
  const now = new Date();

  if (!ctx.can("internal.view")) {
    return <PageHeader title={t("greeting", { name: ctx.user.name.split(" ")[0] })} />;
  }

  const [open, overdue, pending, villas, assets, members] = await Promise.all([
    db.workOrder.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "ON_HOLD"] } } }),
    db.workOrder.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "ON_HOLD"] }, dueDate: { lt: now } } }),
    db.request.count({ where: { status: "PENDING" } }),
    db.villa.count({ where: { archivedAt: null } }),
    db.asset.count({ where: { archivedAt: null } }),
    db.membership.count(),
  ]);
  const pmCount = await db.pMSchedule.count({ where: { active: true } });

  const stats = [
    { label: t("openWorkOrders"), value: open },
    { label: t("overdue"), value: overdue, alert: overdue > 0 },
    { label: t("pendingRequests"), value: pending },
    { label: t("villas"), value: villas },
    { label: t("assets"), value: assets },
  ];

  const steps = [
    { label: t("step1"), done: members > 1, href: "/settings/users" },
    { label: t("step2"), done: villas > 0, href: "/villas" },
    { label: t("step3"), done: assets > 0, href: "/assets" },
    { label: t("step4"), done: pmCount > 0, href: "/preventive" },
  ];

  return (
    <>
      <PageHeader title={t("greeting", { name: ctx.user.name.split(" ")[0] })} description={t("subtitle")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${s.alert ? "text-danger" : ""}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {steps.some((s) => !s.done) && (
        <Card className="mt-6 p-5">
          <h2 className="mb-3 font-medium">{t("gettingStarted")}</h2>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-sm">
                {s.done ? <CircleCheck className="size-4 text-green-600" /> : <Circle className="size-4 text-muted" />}
                {s.done ? (
                  <span className="text-muted line-through">{s.label}</span>
                ) : (
                  <Link href={s.href} className="hover:text-brand">
                    {s.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
