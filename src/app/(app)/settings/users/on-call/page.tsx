import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { OnCallCalendar, OnCallNow, onCallPeople } from "@/components/on-call-calendar";
import { getContext } from "@/lib/context";
import { ON_CALL_ROLES } from "@/lib/on-call";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";
import { MemberToggle } from "./client";

export const generateMetadata = titled("nav.onCall");

// Managing the on-call team and rota: only from Settings → Staff (its "On call" button). Everyone sees it read-only at /on-call.
export default async function ManageOnCallPage({ searchParams }: PageProps<"/settings/users/on-call">) {
  const ctx = await getContext();
  if (!ctx.can("onCall.manage")) notFound();
  const t = await getTranslations();

  const [{ color }, staff] = await Promise.all([
    onCallPeople(ctx),
    ctx.db.membership.findMany({
      where: { active: true, role: { in: ON_CALL_ROLES } },
      select: { userId: true, onCall: true, role: true, user: { select: { name: true } }, jobRole: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <>
      <BackLink href="/settings/users" label={t("nav.users")} />
      <PageHeader title={t("nav.onCall")} description={t("onCall.description")} />
      <OnCallNow ctx={ctx} />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
        <OnCallCalendar ctx={ctx} month={sp(await searchParams, "month")} base="/settings/users/on-call" editable />

        <Card className="p-5">
          <h2 className="font-medium">{t("onCall.team")}</h2>
          <p className="mb-4 mt-1 text-xs text-muted">{t("onCall.teamHint")}</p>
          <ul className="space-y-2">
            {staff.map((m) => (
              <li key={m.userId}>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <MemberToggle userId={m.userId} checked={m.onCall} name={m.user.name} />
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.get(m.userId) ?? "transparent" }} />
                  <span className="min-w-0 flex-1 truncate">{m.user.name}</span>
                  <span className="text-xs text-muted">{m.jobRole?.name ?? t(`roles.${m.role}`)}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
