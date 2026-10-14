import { getTranslations } from "next-intl/server";
import { Check, Lock } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  defaultPermissions,
  EDITABLE_ROLES,
  isEditableRole,
  parsePermissionList,
  parseRolePermissions,
  PERMISSION_GROUPS,
  rolePermissionsFor,
  type Permission,
} from "@/lib/rbac";
import { saveRolePermissionsAction } from "./actions";
import { ResetPermissionsButton } from "./reset-permissions";

type JobRoleRow = { id: string; name: string; access: string; permissions: unknown };

/**
 * What each role may do. The Super Admin edits it; everyone else with access to this page sees it read-only.
 * Columns: Super Admin (everything, fixed), the built-in staff roles, custom roles, and the client role (fixed).
 */
export async function PermissionsMatrix({ rolePermissions, jobRoles, editable }: { rolePermissions: unknown; jobRoles: JobRoleRow[]; editable: boolean }) {
  const t = await getTranslations();
  const overrides = parseRolePermissions(rolePermissions);

  type Column = { key: string; label: string; sub?: string; granted: Permission[]; customised: boolean; fixed?: "all" | "client" };
  const columns: Column[] = [
    { key: "owner", label: t("roles.OWNER"), granted: [], customised: false, fixed: "all" },
    ...EDITABLE_ROLES.map((r) => ({ key: `role:${r}`, label: t(`roles.${r}`), granted: rolePermissionsFor(r, overrides), customised: !!overrides[r] })),
    ...jobRoles.map((j) => {
      const own = parsePermissionList(j.permissions);
      const inherited = isEditableRole(j.access) ? rolePermissionsFor(j.access, overrides) : [];
      return { key: `job:${j.id}`, label: j.name, sub: t("roles.accessLike", { role: t(`roles.${j.access}`) }), granted: own ?? inherited, customised: !!own };
    }),
    { key: "client", label: t("roles.REQUESTER"), granted: defaultPermissions("REQUESTER"), customised: false, fixed: "client" },
  ];

  const cell = (c: Column, p: Permission) => {
    if (c.fixed === "all") return <Check className="mx-auto size-4 text-muted" aria-label={t("perms.always")} />;
    const on = c.granted.includes(p);
    if (c.fixed === "client") return on ? <Check className="mx-auto size-4 text-muted" aria-label={t("perms.always")} /> : <span className="text-muted">—</span>;
    return (
      <input
        type="checkbox"
        name={c.key}
        value={p}
        defaultChecked={on}
        disabled={!editable}
        aria-label={`${c.label}: ${t(`perm.${p}.label` as never)}`}
        className="size-4 accent-brand disabled:opacity-60"
      />
    );
  };

  const table = (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border align-bottom">
                <th className="sticky left-0 z-10 bg-surface py-2 pr-3 text-left font-medium" />
                {columns.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-center text-xs font-medium">
                    <div>{c.label}</div>
                    {c.sub && <div className="font-normal text-muted">{c.sub}</div>}
                    {c.fixed && <div className="font-normal text-muted">{t(c.fixed === "all" ? "perms.fixedAll" : "perms.fixedClient")}</div>}
                    {c.customised && <Badge className="mt-1 bg-amber-50 text-amber-800">{t("perms.customised")}</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-gray-50">
                <td className="sticky left-0 z-10 bg-gray-50 py-2 pr-3">
                  <div className="font-medium">{t("perms.staffApp")}</div>
                  <div className="text-xs text-muted">{t("perms.staffAppHint")}</div>
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-center">
                    {c.fixed === "client" ? <span className="text-muted">—</span> : <Check className="mx-auto size-4 text-muted" aria-label={t("perms.always")} />}
                  </td>
                ))}
              </tr>
              {PERMISSION_GROUPS.map((g) => (
                <GroupRows key={g.key} title={t(`permGroup.${g.key}` as never)} permissions={g.permissions} columns={columns} cell={cell} t={t} />
              ))}
            </tbody>
          </table>
        </div>
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="mb-1 font-medium">{t("perms.title")}</h2>
          <p className="text-sm text-muted">{t("perms.hint")}</p>
          {!editable && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock className="size-3.5" />
              {t("perms.ownerOnly")}
            </p>
          )}
        </div>
        {editable && <ResetPermissionsButton />}
      </div>
      {editable ? (
        <ActionForm action={saveRolePermissionsAction} successMessage={t("common.saved")}>
          {jobRoles.map((j) => (
            <input key={j.id} type="hidden" name={`present:job:${j.id}`} value="1" />
          ))}
          {table}
        </ActionForm>
      ) : (
        table
      )}
    </Card>
  );
}


function GroupRows({
  title,
  permissions,
  columns,
  cell,
  t,
}: {
  title: string;
  permissions: Permission[];
  columns: { key: string }[];
  cell: (c: never, p: Permission) => React.ReactNode;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <>
      <tr>
        <td colSpan={columns.length + 1} className="sticky left-0 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </td>
      </tr>
      {permissions.map((p) => (
        <tr key={p} className="border-b border-border last:border-0 hover:bg-gray-50">
          <td className="sticky left-0 z-10 bg-surface py-2 pr-3">
            <div className="font-medium">{t(`perm.${p}.label` as never)}</div>
            <div className="text-xs text-muted">{t(`perm.${p}.hint` as never)}</div>
          </td>
          {columns.map((c) => (
            <td key={c.key} className={cn("px-2 py-2 text-center")}>
              {cell(c as never, p)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
