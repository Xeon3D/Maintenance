import type { getFormatter, getTranslations } from "next-intl/server";
import { MASK } from "@/lib/audit";

// Readable text for audit entries (Settings → Audit log and its CSV export).

type T = Awaited<ReturnType<typeof getTranslations>>;
type F = Awaited<ReturnType<typeof getFormatter>>;
type Entry = { action: string; entityType: string; meta: unknown };
type Meta = Record<string, unknown>;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const SKIP_META = new Set(["label", "changes", "relations", "roles"]);

export function auditText(t: T, format: F) {
  const has = (key: string) => t.has(key as never);
  const tr = (key: string, values?: Record<string, string>) => t(key as never, values as never) as string;

  const entity = (type: string) => (has(`audit.entities.${type}`) ? tr(`audit.entities.${type}`) : type);
  const field = (k: string) => (has(`audit.fields.${k}`) ? tr(`audit.fields.${k}`) : k);

  /** Enum columns shown in the user's language (WorkOrder.status → woStatus.IN_PROGRESS…). */
  const ENUMS: Record<string, string> = {
    "WorkOrder.status": "woStatus",
    "WorkOrder.type": "woType",
    "Request.status": "requestStatus",
    "Asset.status": "assetStatus",
    "PurchaseOrder.status": "poStatus",
    "ServiceContract.status": "contractStatus",
    "StockLocation.type": "locationType",
    "Vendor.type": "vendorType",
    "Client.type": "clientType",
    priority: "priority",
    criticality: "criticality",
    system: "systems",
    role: "roles",
    access: "roles",
  };
  const enumValue = (type: string, k: string, v: unknown) => {
    const ns = ENUMS[`${type}.${k}`] ?? ENUMS[k];
    return ns && typeof v === "string" && has(`${ns}.${v}`) ? tr(`${ns}.${v}`) : null;
  };

  function value(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    if (v === MASK) return tr("audit.hidden");
    if (typeof v === "boolean") return tr(v ? "audit.yes" : "audit.no");
    if (typeof v === "string" && ISO.test(v)) return format.dateTime(new Date(v), { dateStyle: "short", timeStyle: "short" });
    if (Array.isArray(v)) return v.map(value).join(", ");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  return {
    entity,
    /** The entity on its own (filters, CSV column): "Work order" rather than the in-sentence "work order". */
    entityTitle: (type: string) => {
      const name = entity(type);
      return name.charAt(0).toLocaleUpperCase() + name.slice(1);
    },
    action(e: Entry) {
      if (has(`audit.actions.${e.action}`)) return tr(`audit.actions.${e.action}`);
      const verb = e.action.slice(e.action.lastIndexOf(".") + 1);
      if (has(`audit.verbs.${verb}`)) return tr(`audit.verbs.${verb}`, { entity: entity(e.entityType) });
      return e.action;
    },
    label(e: Entry) {
      const m = (e.meta ?? {}) as Meta;
      return (typeof m.label === "string" && m.label) || (typeof m.name === "string" && m.name) || null;
    },
    /** One line per changed field / detail: [field, before?, after]. */
    details(e: Entry): { field: string; before?: string; after: string }[] {
      const m = (e.meta ?? {}) as Meta;
      const out: { field: string; before?: string; after: string }[] = [];
      for (const [k, pair] of Object.entries((m.changes ?? {}) as Record<string, [unknown, unknown]>)) {
        const show = (v: unknown) => enumValue(e.entityType, k, v) ?? value(v);
        out.push({ field: field(k), before: show(pair[0]), after: show(pair[1]) });
      }
      if (Array.isArray(m.relations) && m.relations.length) out.push({ field: tr("audit.relations"), after: m.relations.map((r) => field(String(r))).join(", ") });
      for (const [role, d] of Object.entries((m.roles ?? {}) as Record<string, { added: string[]; removed: string[] }>)) {
        const perm = (p: string) => (has(`perm.${p}.label`) ? tr(`perm.${p}.label`) : p);
        const parts = [...d.added.map((p) => `+ ${perm(p)}`), ...d.removed.map((p) => `− ${perm(p)}`)];
        out.push({ field: has(`roles.${role}`) ? tr(`roles.${role}`) : role, after: parts.join("; ") });
      }
      for (const [k, v] of Object.entries(m)) {
        if (SKIP_META.has(k) || (k === "name" && !m.label)) continue;
        const shown = k === "direction" && typeof v === "string" && has(`van.${v}`) ? tr(`van.${v}`) : value(v);
        out.push({ field: field(k), after: shown });
      }
      return out;
    },
  };
}
