import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import type { AppContext } from "@/lib/context";
import { savePMAction } from "./actions";
import { PMFields, type PMDefaults } from "./pm-fields";

export async function PMForm({ ctx, id, pm }: { ctx: AppContext; id?: string; pm: PMDefaults }) {
  const t = await getTranslations("common");
  const [procedures, villas, assets, meters, teams, members] = await Promise.all([
    ctx.db.procedure.findMany({ where: { archivedAt: null }, select: { id: true, name: true, system: true }, orderBy: { name: "asc" } }),
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ctx.db.asset.findMany({ where: { archivedAt: null }, select: { id: true, name: true, villaId: true, parentId: true, system: true } }),
    ctx.db.meter.findMany({ include: { asset: { select: { name: true } } }, orderBy: { name: "asc" } }),
    ctx.db.team.findMany({ include: { members: { select: { userId: true } } }, orderBy: { name: "asc" } }),
    ctx.db.membership.findMany({ where: { active: true, role: { not: "REQUESTER" } }, select: { user: { select: { id: true, name: true } } } }),
  ]);

  return (
    <ActionForm action={savePMAction.bind(null, id ?? null)} submitLabel={id ? t("save") : t("create")}>
      <PMFields
        pm={pm}
        timeZone={ctx.organization.timezone}
        procedures={procedures}
        villas={villas}
        assets={assets}
        meters={meters.map((m) => ({ id: m.id, name: m.name, unit: m.unit, assetId: m.assetId, assetName: m.asset.name, lastValue: m.lastValue }))}
        teams={teams.map((x) => ({ id: x.id, name: x.name, memberIds: x.members.map((m) => m.userId) }))}
        people={members.map((m) => m.user).sort((a, b) => a.name.localeCompare(b.name))}
      />
    </ActionForm>
  );
}
