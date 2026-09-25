import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, PageHeader, Table } from "@/components/ui";
import { getContext } from "@/lib/context";
import { InviteForm, MemberControls, RevokeInviteButton } from "./client";

export default async function UsersPage() {
  const ctx = await getContext();
  if (!ctx.can("users.manage")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();

  const [members, invites, clients] = await Promise.all([
    ctx.db.membership.findMany({
      include: { user: true, client: true },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    }),
    ctx.db.invitation.findMany({ where: { acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    ctx.db.client.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title={t("settings.usersTitle")} description={t("settings.usersDescription")} />

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-medium">{t("settings.invite")}</h2>
        <InviteForm clients={clients} />
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("common.role")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const locked = m.role === "OWNER" || m.userId === ctx.user.id;
              return (
                <tr key={m.id} className={m.active ? "" : "opacity-60"}>
                  <td>
                    <div className="font-medium">
                      {m.user.name} {m.userId === ctx.user.id && <span className="text-muted">({t("common.you")})</span>}
                    </div>
                    <div className="text-xs text-muted">{m.user.email}</div>
                  </td>
                  <td>
                    {t(`roles.${m.role}`)}
                    {m.client && <div className="text-xs text-muted">{m.client.name}</div>}
                  </td>
                  <td>
                    <Badge className={m.active ? "bg-green-50 text-green-700" : ""}>
                      {m.active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </td>
                  <td className="text-right">{!locked && <MemberControls id={m.id} role={m.role} active={m.active} />}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {invites.length > 0 && (
        <Card className="mt-6">
          <h2 className="px-4 pt-4 font-medium">{t("settings.pendingInvites")}</h2>
          <Table>
            <thead>
              <tr>
                <th>{t("common.email")}</th>
                <th>{t("common.role")}</th>
                <th>{t("settings.expires")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{t(`roles.${i.role}`)}</td>
                  <td className="text-muted">{format.relativeTime(i.expiresAt)}</td>
                  <td className="text-right">
                    <RevokeInviteButton id={i.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
