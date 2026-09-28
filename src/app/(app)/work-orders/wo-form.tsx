import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import type { AppContext } from "@/lib/context";
import { saveWorkOrderAction } from "./actions";
import { WorkOrderFields, type WODefaults } from "./wo-fields";

/** Loads reference lists and renders the create/edit work order form. */
export async function WorkOrderForm({ ctx, id, wo }: { ctx: AppContext; id?: string; wo: WODefaults }) {
  const t = await getTranslations("common");
  const [villas, areas, assets, teams, members] = await Promise.all([
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    ctx.db.area.findMany({ select: { id: true, name: true, villaId: true, parentId: true } }),
    ctx.db.asset.findMany({ where: { archivedAt: null }, select: { id: true, name: true, villaId: true, parentId: true, system: true } }),
    ctx.db.team.findMany({ include: { members: { select: { userId: true } } }, orderBy: { name: "asc" } }),
    ctx.db.membership.findMany({
      where: { active: true, role: { not: "REQUESTER" } },
      select: { user: { select: { id: true, name: true } } },
    }),
  ]);
  const people = members.map((m) => m.user).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ActionForm action={saveWorkOrderAction.bind(null, id ?? null)} submitLabel={id ? t("save") : t("create")}>
      <WorkOrderFields
        wo={wo}
        villas={villas}
        areas={areas}
        assets={assets}
        teams={teams.map((x) => ({ id: x.id, name: x.name, memberIds: x.members.map((m) => m.userId) }))}
        people={people}
      />
    </ActionForm>
  );
}
