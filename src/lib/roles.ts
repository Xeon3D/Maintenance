import type { Role } from "@/generated/prisma/enums";

// Roles and their cost per hour (pure; shared by pages, actions and tests).
// Built-in staff roles have a company-wide rate (Organization.roleRates); custom roles (JobRole)
// carry their own rate and borrow the permissions of a built-in staff role. Viewers (observers)
// and portal clients never log time, so they have no rate.

export const RATED_ROLES = ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"] as const satisfies readonly Role[];

export type RoleRates = Partial<Record<Role, number>>;

export function parseRoleRates(raw: unknown): RoleRates {
  const out: RoleRates = {};
  if (raw && typeof raw === "object") {
    for (const r of RATED_ROLES) {
      const v = Number((raw as Record<string, unknown>)[r]);
      if ((raw as Record<string, unknown>)[r] != null && Number.isFinite(v) && v >= 0) out[r] = v;
    }
  }
  return out;
}

const isRated = (role: Role) => (RATED_ROLES as readonly Role[]).includes(role);

type MemberLike = { role: Role; hourlyRate?: unknown; jobRole?: { hourlyRate: unknown } | null };
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

/**
 * Cost per hour of a member's time: the custom role's rate, else the built-in role's rate, else the
 * legacy per-person rate. Null for viewers and portal clients, or when nothing is set.
 */
export function hourlyRateFor(m: MemberLike, rates: RoleRates): number | null {
  if (!isRated(m.role)) return null;
  return num(m.jobRole?.hourlyRate) ?? rates[m.role] ?? num(m.hourlyRate);
}

/** Display name: the custom role's name, else the built-in role (translated by the caller). */
export function roleName(m: { role: Role; jobRole?: { name: string } | null }, builtIn: (role: Role) => string) {
  return m.jobRole?.name ?? builtIn(m.role);
}

/** Roles every new company starts with, besides the built-in ones (technician access; rename or delete freely). */
export const DEFAULT_JOB_ROLES = ["Designer", "Electrician", "Engineer", "Helper", "Integrator"];

/**
 * The only built-in role someone can take on a work order; the company's own roles can all be taken too.
 * Super Admin, administrator, manager, accountant, viewer and client are office or outside roles, never a job role.
 */
export const WORK_ORDER_BUILT_IN_ROLE = "TECHNICIAN" satisfies Role;

type AssigneeLike = { role: Role | null; jobRole: { access: Role; hourlyRate: unknown } | null } | null | undefined;

/** Cost per hour of a member's time on a job: the role they took on it (Technician or a company role), else their own. */
export function workOrderRateFor(m: MemberLike, a: AssigneeLike, rates: RoleRates): number | null {
  if (a?.jobRole) return hourlyRateFor({ role: a.jobRole.access, hourlyRate: m.hourlyRate, jobRole: a.jobRole }, rates);
  if (a?.role) return hourlyRateFor({ role: a.role, hourlyRate: m.hourlyRate }, rates);
  return hourlyRateFor(m, rates);
}
