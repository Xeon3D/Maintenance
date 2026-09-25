import { z } from "zod";
import { enumOf, optDate, optId, optNumber, optStr, str } from "@/lib/forms";
import { isIpAddress, normaliseMac } from "@/lib/asset-catalog";
import { AssetStatus, Criticality, SystemType } from "@/generated/prisma/enums";

export const assetSchema = z.object({
  villaId: str(40),
  areaId: optId(),
  parentId: optId(),
  vendorId: optId(),
  name: str(150),
  code: optStr(50),
  system: enumOf(SystemType),
  category: optStr(100),
  manufacturer: optStr(100),
  model: optStr(100),
  serialNumber: optStr(100),
  macAddress: optStr(30).refine((v) => v === null || normaliseMac(v) !== null, { message: "invalid_mac" }).transform((v) => (v ? normaliseMac(v) : null)),
  ipAddress: optStr(45).refine((v) => v === null || isIpAddress(v), { message: "invalid_ip" }),
  vlan: optStr(20),
  firmware: optStr(50),
  status: enumOf(AssetStatus).default("OPERATIONAL"),
  criticality: enumOf(Criticality).default("MEDIUM"),
  installDate: optDate(),
  warrantyExpiry: optDate(),
  purchaseCost: optNumber().refine((v) => v === null || v >= 0),
  notes: optStr(5000),
});

export type AssetInput = z.output<typeof assetSchema>;
