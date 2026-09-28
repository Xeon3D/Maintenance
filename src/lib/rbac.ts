import type { Role } from "@/generated/prisma/enums";

// Permission matrix. Keep actions coarse; add new ones as modules land.
export const PERMISSIONS = {
  "org.manage": ["OWNER", "ADMIN"],
  "billing.manage": ["OWNER"],
  "users.manage": ["OWNER", "ADMIN"],
  "teams.manage": ["OWNER", "ADMIN", "MANAGER"],
  "clients.manage": ["OWNER", "ADMIN", "MANAGER"],
  "contracts.manage": ["OWNER", "ADMIN", "MANAGER"],
  "assets.manage": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"],
  "secrets.view": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"],
  "workOrders.create": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"],
  "workOrders.manage": ["OWNER", "ADMIN", "MANAGER"], // assign, delete, edit anyone's
  "workOrders.execute": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"],
  "requests.create": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "REQUESTER"],
  "requests.approve": ["OWNER", "ADMIN", "MANAGER"],
  "pm.manage": ["OWNER", "ADMIN", "MANAGER"],
  "procedures.manage": ["OWNER", "ADMIN", "MANAGER"],
  "inventory.manage": ["OWNER", "ADMIN", "MANAGER"],
  "inventory.use": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN"],
  "purchasing.manage": ["OWNER", "ADMIN", "MANAGER"],
  "purchasing.approve": ["OWNER", "ADMIN"],
  "vendors.manage": ["OWNER", "ADMIN", "MANAGER"],
  "reports.view": ["OWNER", "ADMIN", "MANAGER", "VIEWER"],
  "internal.view": ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "VIEWER"], // anything not client-facing
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "MANAGER", "TECHNICIAN", "REQUESTER", "VIEWER"];
