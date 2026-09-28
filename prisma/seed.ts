// Demo data: one organization with users for every role, teams and a sample client/villa.
// Run with `npm run db:seed`. Safe to re-run: it skips if the demo owner already exists.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const PASSWORD = "demo1234";

async function main() {
  if (await prisma.user.findUnique({ where: { email: "owner@demo.test" } })) {
    console.log("Demo data already present, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const mk = (email: string, name: string, locale = "en") =>
    prisma.user.create({ data: { email, name, passwordHash, locale } });

  const [owner, manager, techNet, techElec, viewer, clientUser] = await Promise.all([
    mk("owner@demo.test", "Sofia Almeida", "pt"),
    mk("manager@demo.test", "Miguel Costa", "pt"),
    mk("tech.network@demo.test", "Rui Ferreira", "pt"),
    mk("tech.electrical@demo.test", "Daniel Hughes"),
    mk("viewer@demo.test", "Ana Viewer"),
    mk("client@demo.test", "James Whitmore"),
  ]);

  const org = await prisma.organization.create({
    data: {
      name: "Demo Integrations Lda",
      slug: "demo-integrations",
      subscription: { create: { status: "TRIALING", trialEndsAt: new Date(Date.now() + 14 * 86_400_000) } },
      stockLocations: {
        create: [
          { name: "Main warehouse", type: "WAREHOUSE" },
          { name: "Van — Rui", type: "VAN", userId: techNet.id },
          { name: "Van — Daniel", type: "VAN", userId: techElec.id },
        ],
      },
    },
  });

  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: "Whitmore Family Office",
      type: "PRIVATE_OWNER",
      email: "office@whitmore.test",
      contacts: { create: [{ name: "Maria Santos", role: "House manager", phone: "+351 912 000 000", isPrimary: true }] },
    },
  });

  await prisma.membership.createMany({
    data: [
      { organizationId: org.id, userId: owner.id, role: "OWNER" },
      { organizationId: org.id, userId: manager.id, role: "MANAGER" },
      { organizationId: org.id, userId: techNet.id, role: "TECHNICIAN", hourlyRate: 45 },
      { organizationId: org.id, userId: techElec.id, role: "TECHNICIAN", hourlyRate: 45 },
      { organizationId: org.id, userId: viewer.id, role: "VIEWER" },
      { organizationId: org.id, userId: clientUser.id, role: "REQUESTER", clientId: client.id },
    ],
  });

  await prisma.team.create({
    data: {
      organizationId: org.id,
      name: "Network & A/V",
      system: "NETWORK",
      color: "#0e7490",
      members: { create: [{ userId: techNet.id }] },
    },
  });
  await prisma.team.create({
    data: {
      organizationId: org.id,
      name: "Electrical & Lighting",
      system: "ELECTRICAL",
      color: "#b45309",
      members: { create: [{ userId: techElec.id }] },
    },
  });

  const villa = await prisma.villa.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      name: "Villa Quinta do Lago 7",
      code: "VQL-07",
      city: "Almancil",
      country: "Portugal",
      accessNotes: "Staff entrance on the east side. Call the house manager 30 min before arrival.",
    },
  });
  const [ground, rack] = await Promise.all([
    prisma.area.create({ data: { organizationId: org.id, villaId: villa.id, name: "Ground floor", kind: "FLOOR" } }),
    prisma.area.create({ data: { organizationId: org.id, villaId: villa.id, name: "Technical room", kind: "TECH_ROOM" } }),
  ]);
  await prisma.area.create({
    data: { organizationId: org.id, villaId: villa.id, parentId: ground.id, name: "Cinema room", kind: "ROOM" },
  });

  const rackAsset = await prisma.asset.create({
    data: { organizationId: org.id, villaId: villa.id, areaId: rack.id, name: "Main rack", system: "NETWORK", category: "Rack" },
  });
  await prisma.asset.createMany({
    data: [
      { organizationId: org.id, villaId: villa.id, areaId: rack.id, parentId: rackAsset.id, name: "Core switch", system: "NETWORK", category: "PoE switch", manufacturer: "Ubiquiti", model: "USW-Pro-48-PoE", ipAddress: "10.0.0.2", vlan: "1" },
      { organizationId: org.id, villaId: villa.id, areaId: rack.id, parentId: rackAsset.id, name: "NVR", system: "CCTV", category: "NVR", manufacturer: "Hikvision", model: "DS-7732NI-M4", ipAddress: "10.0.20.10", vlan: "20" },
      { organizationId: org.id, villaId: villa.id, areaId: rack.id, name: "KNX IP router", system: "AUTOMATION", category: "KNX IP router", manufacturer: "MDT", model: "SCN-IP100.03" },
      { organizationId: org.id, villaId: villa.id, areaId: rack.id, name: "Main distribution board", system: "ELECTRICAL", category: "Distribution board", criticality: "CRITICAL" },
    ],
  });

  await prisma.serviceContract.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      name: "Premium maintenance",
      startDate: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
      responseTimeHours: 4,
      resolutionTimeHours: 48,
      includedVisits: 4,
      monthlyFee: 450,
    },
  });

  // Inventory: two vendors and a few spares, stocked in the warehouse and the vans.
  const [netVendor, elecVendor] = await Promise.all([
    prisma.vendor.create({
      data: { organizationId: org.id, name: "Redes Lusas Distribuição", email: "orders@redeslusas.test", systems: ["NETWORK", "CCTV", "AV"] },
    }),
    prisma.vendor.create({
      data: { organizationId: org.id, name: "Eléctrica do Sul", email: "vendas@electricadosul.test", systems: ["ELECTRICAL", "LIGHTING", "AUTOMATION"] },
    }),
  ]);
  const locations = await prisma.stockLocation.findMany({ where: { organizationId: org.id }, orderBy: { name: "asc" } });
  const [warehouse, vanDaniel, vanRui] = locations; // "Main warehouse", "Van — Daniel", "Van — Rui"
  const spares = [
    { name: "PoE injector 30W", sku: "POE-30", system: "NETWORK", unitCost: 24.9, min: 4, vendorId: netVendor.id, stock: [[warehouse, 6], [vanRui, 2]] },
    { name: "Cat6A keystone jack", sku: "KS-6A", system: "NETWORK", unitCost: 4.2, min: 20, vendorId: netVendor.id, stock: [[warehouse, 12], [vanRui, 6]] },
    { name: "UPS battery 12V 9Ah", sku: "BAT-12-9", system: "ELECTRICAL", unitCost: 32.5, min: 4, vendorId: elecVendor.id, stock: [[warehouse, 8]] },
    { name: "DIN rail MCB 16A C-curve", sku: "MCB-C16", system: "ELECTRICAL", unitCost: 7.8, min: 10, vendorId: elecVendor.id, stock: [[warehouse, 15], [vanDaniel, 4]] },
  ] as const;
  for (const s of spares) {
    const part = await prisma.part.create({
      data: { organizationId: org.id, name: s.name, sku: s.sku, system: s.system, unitCost: s.unitCost, minQuantity: s.min, vendorId: s.vendorId },
    });
    for (const [loc, quantity] of s.stock) {
      await prisma.partStock.create({ data: { partId: part.id, locationId: loc.id, quantity } });
      await prisma.stockMovement.create({
        data: { organizationId: org.id, partId: part.id, locationId: loc.id, type: "ADJUSTMENT", quantity, userId: manager.id, note: "Opening stock" },
      });
    }
  }

  console.log(`Seeded "${org.name}". Sign in with owner@demo.test / ${PASSWORD} (all demo users share this password).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
