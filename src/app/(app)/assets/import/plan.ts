import "server-only";
import Papa from "papaparse";
import type { AppContext } from "@/lib/context";
import { Criticality, SystemType } from "@/generated/prisma/enums";
import en from "../../../../../messages/en.json";
import pt from "../../../../../messages/pt.json";
import { assetSchema, type AssetInput } from "../schema";

export const MAX_ROWS = 2000;

export const TEMPLATE_COLUMNS = [
  "villa",
  "area",
  "parent",
  "name",
  "system",
  "category",
  "manufacturer",
  "model",
  "serial",
  "mac",
  "ip",
  "vlan",
  "firmware",
  "criticality",
  "install_date",
  "warranty_expiry",
  "code",
  "notes",
] as const;

// Header aliases (lowercased, spaces/underscores stripped) → canonical column.
const HEADER_ALIASES: Record<string, (typeof TEMPLATE_COLUMNS)[number]> = {
  villa: "villa", moradia: "villa", site: "villa", villacode: "villa",
  area: "area", room: "area", divisao: "area", divisão: "area", location: "area",
  parent: "parent", pai: "parent", parentasset: "parent",
  name: "name", nome: "name", asset: "name",
  system: "system", sistema: "system",
  category: "category", categoria: "category", type: "category",
  manufacturer: "manufacturer", brand: "manufacturer", marca: "manufacturer", fabricante: "manufacturer",
  model: "model", modelo: "model",
  serial: "serial", serialnumber: "serial", sn: "serial", numerodeserie: "serial",
  mac: "mac", macaddress: "mac",
  ip: "ip", ipaddress: "ip",
  vlan: "vlan",
  firmware: "firmware", fw: "firmware",
  criticality: "criticality", criticidade: "criticality",
  installdate: "install_date", installed: "install_date", instalacao: "install_date",
  warrantyexpiry: "warranty_expiry", warranty: "warranty_expiry", garantia: "warranty_expiry",
  code: "code", codigo: "code", tag: "code",
  notes: "notes", notas: "notes",
};

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-./()]/g, "");

// Accept enum keys and translated labels in both languages ("Network", "Rede", "Áudio/Vídeo"…).
function lookup<T extends string>(values: T[], labels: Record<string, string>[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const v of values) {
    map.set(norm(v), v);
    for (const l of labels) if (l[v]) map.set(norm(l[v]), v);
  }
  return map;
}
const SYSTEMS = lookup(Object.values(SystemType), [en.systems, pt.systems]);
const CRITICALITY = lookup(Object.values(Criticality), [en.criticality, pt.criticality]);
SYSTEMS.set("av", "AV");
SYSTEMS.set("audiovideo", "AV");
SYSTEMS.set("electric", "ELECTRICAL");
SYSTEMS.set("knx", "AUTOMATION");
SYSTEMS.set("domotica", "AUTOMATION");

export type ImportError = { row: number; message: string; params?: Record<string, string> };

export type ImportPlan = {
  rows: { line: number; data: AssetInput; areaName: string | null; parentName: string | null }[];
  newAreas: { villaId: string; name: string }[];
  errors: ImportError[];
  villasTouched: number;
};

/** Parses and validates a CSV against the org's villas/areas/assets without writing anything. */
export async function planImport(ctx: AppContext, csv: string): Promise<ImportPlan> {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => HEADER_ALIASES[norm(h)] ?? `?${h}`,
  });
  const errors: ImportError[] = [];
  if (parsed.data.length === 0) errors.push({ row: 0, message: "empty" });
  if (parsed.data.length > MAX_ROWS) errors.push({ row: 0, message: "tooMany", params: { max: String(MAX_ROWS) } });
  const fields = parsed.meta.fields ?? [];
  for (const required of ["villa", "name", "system"]) {
    if (!fields.includes(required)) errors.push({ row: 0, message: "missingColumn", params: { column: required } });
  }
  if (errors.length) return { rows: [], newAreas: [], errors, villasTouched: 0 };

  const [villas, areas, assets] = await Promise.all([
    ctx.db.villa.findMany({ where: { archivedAt: null }, select: { id: true, name: true, code: true } }),
    ctx.db.area.findMany({ select: { id: true, villaId: true, name: true } }),
    ctx.db.asset.findMany({ where: { archivedAt: null }, select: { villaId: true, name: true } }),
  ]);
  const villaByKey = new Map<string, string>();
  for (const v of villas) {
    villaByKey.set(norm(v.name), v.id);
    if (v.code) villaByKey.set(norm(v.code), v.id);
  }
  const areaKey = (villaId: string, name: string) => `${villaId}|${norm(name)}`;
  const existingAreas = new Set(areas.map((a) => areaKey(a.villaId, a.name)));
  const knownAssets = new Set(assets.map((a) => areaKey(a.villaId, a.name)));

  const plan: ImportPlan = { rows: [], newAreas: [], errors, villasTouched: 0 };
  const newAreaKeys = new Set<string>();
  const touched = new Set<string>();

  parsed.data.forEach((raw, i) => {
    const line = i + 2; // 1-based, after header
    const get = (k: string) => (raw[k] ?? "").trim();
    const villaId = villaByKey.get(norm(get("villa")));
    if (!villaId) return errors.push({ row: line, message: "unknownVilla", params: { value: get("villa") } });
    const system = SYSTEMS.get(norm(get("system")));
    if (!system) return errors.push({ row: line, message: "unknownSystem", params: { value: get("system") } });
    const critRaw = get("criticality");
    const criticality = critRaw ? CRITICALITY.get(norm(critRaw)) : "MEDIUM";
    if (!criticality) return errors.push({ row: line, message: "unknownCriticality", params: { value: critRaw } });

    const result = assetSchema.safeParse({
      villaId,
      name: get("name"),
      system,
      category: get("category"),
      manufacturer: get("manufacturer"),
      model: get("model"),
      serialNumber: get("serial"),
      macAddress: get("mac"),
      ipAddress: get("ip"),
      vlan: get("vlan"),
      firmware: get("firmware"),
      criticality,
      installDate: get("install_date"),
      warrantyExpiry: get("warranty_expiry"),
      code: get("code"),
      notes: get("notes"),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      return errors.push({
        row: line,
        message: "invalidField",
        params: { field: String(issue.path[0] ?? ""), value: get(String(issue.path[0] ?? "")) },
      });
    }

    const areaName = get("area") || null;
    if (areaName && !existingAreas.has(areaKey(villaId, areaName)) && !newAreaKeys.has(areaKey(villaId, areaName))) {
      newAreaKeys.add(areaKey(villaId, areaName));
      plan.newAreas.push({ villaId, name: areaName });
    }
    const parentName = get("parent") || null;
    if (parentName && !knownAssets.has(areaKey(villaId, parentName))) {
      return errors.push({ row: line, message: "unknownParent", params: { value: parentName } });
    }
    knownAssets.add(areaKey(villaId, result.data.name)); // later rows may use this row as parent
    touched.add(villaId);
    plan.rows.push({ line, data: result.data, areaName, parentName });
  });

  plan.villasTouched = touched.size;
  return plan;
}

/** Writes a validated plan: creates missing areas, then assets in file order (so parents exist first). */
export async function commitImport(ctx: AppContext, plan: ImportPlan) {
  const orgId = ctx.organization.id;
  return ctx.db.$transaction(
    async (tx) => {
      const areaIds = new Map<string, string>();
      const key = (villaId: string, name: string) => `${villaId}|${norm(name)}`;
      for (const a of await tx.area.findMany({ where: { organizationId: orgId }, select: { id: true, villaId: true, name: true } })) {
        areaIds.set(key(a.villaId, a.name), a.id);
      }
      for (const a of plan.newAreas) {
        const created = await tx.area.create({ data: { organizationId: orgId, villaId: a.villaId, name: a.name, kind: "ROOM" } });
        areaIds.set(key(a.villaId, a.name), created.id);
      }

      const assetIds = new Map<string, string>();
      for (const a of await tx.asset.findMany({
        where: { organizationId: orgId, archivedAt: null },
        select: { id: true, villaId: true, name: true },
      })) {
        assetIds.set(key(a.villaId, a.name), a.id);
      }

      for (const row of plan.rows) {
        const { villaId } = row.data;
        const created = await tx.asset.create({
          data: {
            ...row.data,
            organizationId: orgId,
            areaId: row.areaName ? (areaIds.get(key(villaId, row.areaName)) ?? null) : null,
            parentId: row.parentName ? (assetIds.get(key(villaId, row.parentName)) ?? null) : null,
            statusLogs: { create: { status: row.data.status, userId: ctx.user.id, note: "CSV import" } },
          },
        });
        assetIds.set(key(villaId, created.name), created.id);
      }
      return plan.rows.length;
    },
    { timeout: 120_000 },
  );
}
