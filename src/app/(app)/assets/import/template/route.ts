import { getContext } from "@/lib/context";
import { TEMPLATE_COLUMNS } from "../plan";

// CSV template with two example rows. Uses the org's first villa code/name when available.
export async function GET() {
  const ctx = await getContext();
  const villa = await ctx.db.villa.findFirst({ where: { archivedAt: null }, select: { code: true, name: true } });
  const v = villa?.code ?? villa?.name ?? "VQL-07";
  const example: Record<string, string>[] = [
    { villa: v, area: "Technical room", name: "Main rack", system: "Network", category: "Rack" },
    {
      villa: v,
      area: "Technical room",
      parent: "Main rack",
      name: "Core switch",
      system: "Network",
      category: "PoE switch",
      manufacturer: "Ubiquiti",
      model: "USW-Pro-24-PoE",
      mac: "AA:BB:CC:DD:EE:01",
      ip: "10.0.0.2",
      vlan: "1",
      criticality: "High",
      install_date: "2025-03-01",
      warranty_expiry: "2027-03-01",
    },
  ];
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [TEMPLATE_COLUMNS.join(","), ...example.map((r) => TEMPLATE_COLUMNS.map((c) => esc(r[c] ?? "")).join(","))];
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="assets-template.csv"',
    },
  });
}
