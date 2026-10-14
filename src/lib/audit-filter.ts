import type { Prisma } from "@/generated/prisma/client";

// Filters of Settings → Audit log (page and CSV export), from the URL's search params.

export const AUDIT_CATEGORIES = ["security", "users", "records", "server"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Entities whose changes are "users and permissions" rather than everyday records. */
export const PEOPLE_ENTITIES = ["Membership", "Invitation", "JobRole", "Team", "Organization", "User"];

/** Where each audited entity can be opened (only while it still exists). */
export const ENTITY_PATHS: Record<string, string> = {
  WorkOrder: "/work-orders",
  Request: "/requests",
  Client: "/clients",
  Villa: "/villas",
  Asset: "/assets",
  Part: "/parts",
  Vendor: "/vendors",
  PurchaseOrder: "/purchase-orders",
  ServiceContract: "/contracts",
  PMSchedule: "/preventive",
  Procedure: "/procedures",
};

const SECURITY: Prisma.AuditLogWhereInput = { OR: [{ action: { startsWith: "auth." } }, { action: { startsWith: "server.unlock" } }] };
const SERVER: Prisma.AuditLogWhereInput = { AND: [{ action: { startsWith: "server." } }, { NOT: { action: { startsWith: "server.unlock" } } }] };
const PEOPLE: Prisma.AuditLogWhereInput = {
  AND: [{ entityType: { in: PEOPLE_ENTITIES } }, { NOT: { action: { startsWith: "auth." } } }],
};

export function categoryWhere(c: string | undefined): Prisma.AuditLogWhereInput {
  switch (c) {
    case "security":
      return SECURITY;
    case "server":
      return SERVER;
    case "users":
      return PEOPLE;
    case "records":
      return { NOT: [SECURITY, SERVER, PEOPLE, { entityType: "Server" }] };
    default:
      return {};
  }
}

/** Which category an entry belongs to (for its badge). */
export function categoryOf(e: { action: string; entityType: string }): AuditCategory {
  if (e.action.startsWith("auth.") || e.action.startsWith("server.unlock")) return "security";
  if (e.action.startsWith("server.")) return "server";
  if (PEOPLE_ENTITIES.includes(e.entityType)) return "users";
  return "records";
}

/** Milliseconds `timeZone` is ahead of UTC at `at`. */
function offsetMs(timeZone: string, at: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - at;
}

/** Midnight of "yyyy-mm-dd" in `timeZone`, or null for anything else. */
export function dayStart(ymd: string | undefined, timeZone: string): Date | null {
  const m = ymd?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return new Date(guess - offsetMs(timeZone, guess - offsetMs(timeZone, guess)));
}

type SP = Record<string, string | string[] | undefined>;
const one = (p: SP, k: string) => (typeof p[k] === "string" && p[k] !== "" ? (p[k] as string) : undefined);

/** The Prisma filter for the page's search params; dates are whole days in the company's time zone. */
export function auditWhere(params: SP, timeZone: string): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [categoryWhere(one(params, "category"))];
  const userId = one(params, "userId");
  if (userId === "system") and.push({ userId: null });
  else if (userId) and.push({ userId });
  const entity = one(params, "entity");
  if (entity) and.push({ entityType: entity });
  const from = dayStart(one(params, "from"), timeZone);
  const to = dayStart(one(params, "to"), timeZone);
  if (from) and.push({ createdAt: { gte: from } });
  if (to) and.push({ createdAt: { lt: new Date(to.getTime() + 24 * 3600_000) } });
  const q = one(params, "q")?.trim();
  if (q) {
    and.push({
      OR: [
        { action: { contains: q, mode: "insensitive" } },
        { entityId: q },
        { ip: { contains: q } },
        { meta: { path: ["label"], string_contains: q } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: and };
}
