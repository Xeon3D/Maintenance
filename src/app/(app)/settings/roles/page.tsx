import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { ActionForm, FieldError } from "@/components/action-form";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { getContext } from "@/lib/context";
import { defaultPermissions, GRANTABLE, isEditableRole, jobRolePermissionsFor, parseRolePermissions, rolePermissionsFor } from "@/lib/rbac";
import { CUSTOM_ROLE_ACCESS, parseRoleRates, RATED_ROLES } from "@/lib/roles";
import { saveJobRoleAction, saveRoleRatesAction } from "./actions";
import { DeleteJobRoleButton } from "./delete-button";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("nav.roles");

export default async function RolesPage() {
  const ctx = await getContext();
  if (!ctx.can("users.manage")) notFound();
  const t = await getTranslations();
  const rates = parseRoleRates(ctx.organization.roleRates);
  const jobRoles = await ctx.db.jobRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: { where: { active: true } } } } },
  });
  const currency = ctx.organization.currency;
  const rateInput = (name: string, value: unknown) => (
    <div className="flex items-center justify-end gap-1.5">
      <Input name={name} type="number" min={0} step="0.01" defaultValue={value == null ? "" : String(value)} placeholder="—" className="h-9 w-28 text-right tabular-nums" />
      <span className="w-8 text-xs text-muted">{currency}</span>
    </div>
  );
  // Each role's "Permissions" button opens its own page, with how many of the permissions it has.
  const overrides = parseRolePermissions(ctx.organization.rolePermissions);
  const grantedCount = (role: string) =>
    role === "OWNER" ? GRANTABLE.length : isEditableRole(role) ? rolePermissionsFor(role, overrides).length : GRANTABLE.filter((p) => defaultPermissions("REQUESTER").includes(p)).length;
  const permissions = (key: string, count: number) => (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs tabular-nums text-muted sm:inline">{t("perms.summary", { on: count, total: GRANTABLE.length })}</span>
      <Link href={`/settings/roles/${key}/permissions`}>
        <Button type="button" size="sm" variant="secondary">
          <ShieldCheck className="size-4" />
          {t("perms.title")}
        </Button>
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader title={t("roles.title")} description={t("roles.description")} />
      <div className="max-w-5xl space-y-6">
        <Card className="p-5">
          <h2 className="mb-1 font-medium">{t("roles.builtIn")}</h2>
          <p className="mb-4 text-sm text-muted">{t("roles.builtInHint")}</p>
          <ActionForm action={saveRoleRatesAction} successMessage={t("common.saved")}>
            <div className="divide-y divide-border rounded-md border border-border">
              {RATED_ROLES.map((r) => (
                <div key={r} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{t(`roles.${r}`)}</div>
                    <div className="text-xs text-muted">{t(`roles.can.${r}`)}</div>
                  </div>
                  {permissions(r, grantedCount(r))}
                  <div>
                    {rateInput(r, rates[r])}
                    <FieldError name={r} />
                  </div>
                </div>
              ))}
              {(["VIEWER", "ACCOUNTANT", "REQUESTER"] as const).map((r) => (
                <div key={r} className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{t(`roles.${r}`)}</div>
                    <div className="text-xs text-muted">{t(`roles.can.${r}`)}</div>
                  </div>
                  {permissions(r, grantedCount(r))}
                  <span className="w-[9.5rem] text-right text-xs text-muted">{t("roles.notBillable")}</span>
                </div>
              ))}
            </div>
          </ActionForm>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-medium">{t("roles.custom")}</h2>
          <p className="mb-4 text-sm text-muted">{t("roles.customHint")}</p>
          <div className="space-y-3">
            {jobRoles.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <ActionForm action={saveJobRoleAction.bind(null, r.id)} successMessage={t("common.saved")} footer={
                    <>
                      {permissions(r.id, jobRolePermissionsFor(r.access, r.permissions, overrides).length)}
                      <DeleteJobRoleButton id={r.id} name={r.name} members={r._count.memberships} />
                    </>
                  }
                >
                  <JobRoleFields t={t} name={r.name} access={r.access} rate={rateInput("hourlyRate", r.hourlyRate)} members={r._count.memberships} />
                </ActionForm>
              </div>
            ))}
            <div className="rounded-md border border-dashed border-border p-3">
              <h3 className="mb-3 text-sm font-medium">{t("roles.new")}</h3>
              {/* Keyed on the count so the form clears after a role is created. */}
              <ActionForm key={jobRoles.length} action={saveJobRoleAction.bind(null, null)} submitLabel={t("common.create")}>
                <JobRoleFields t={t} name="" access="TECHNICIAN" rate={rateInput("hourlyRate", null)} />
              </ActionForm>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function JobRoleFields({
  t,
  name,
  access,
  rate,
  members,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
  name: string;
  access: string;
  rate: React.ReactNode;
  members?: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <label className="block space-y-1">
        <span className="text-xs text-muted">{t("common.name")}</span>
        <Input name="name" defaultValue={name} placeholder={t("roles.namePlaceholder")} maxLength={60} required />
        <FieldError name="name" />
        {members !== undefined && <span className="block text-xs text-muted">{t("roles.members", { count: members })}</span>}
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">{t("roles.access")}</span>
        <Select name="access" defaultValue={access}>
          {CUSTOM_ROLE_ACCESS.map((a) => (
            <option key={a} value={a}>
              {t("roles.accessLike", { role: t(`roles.${a}`) })}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1">
        <span className="block text-right text-xs text-muted">{t("roles.costPerHour")}</span>
        {rate}
        <FieldError name="hourlyRate" />
      </label>
    </div>
  );
}
