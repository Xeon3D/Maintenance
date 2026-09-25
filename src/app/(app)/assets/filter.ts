import { searchWhere, sp } from "@/lib/list";
import { AssetStatus, SystemType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/** Builds the asset `where` from list search params; shared by the list and labels pages. */
export function assetFilter(params: Record<string, string | string[] | undefined>): Prisma.AssetWhereInput {
  const system = sp(params, "system");
  const status = sp(params, "status");
  return {
    archivedAt: sp(params, "archived") === "1" ? { not: null } : null,
    ...(sp(params, "villaId") ? { villaId: sp(params, "villaId") } : {}),
    ...(system && system in SystemType ? { system: system as SystemType } : {}),
    ...(status && status in AssetStatus ? { status: status as AssetStatus } : {}),
    ...searchWhere(sp(params, "q"), ["name", "code", "category", "manufacturer", "model", "serialNumber", "macAddress", "ipAddress"]),
  };
}
