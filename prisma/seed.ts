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

  console.log(`Seeded "${org.name}". Sign in with owner@demo.test / ${PASSWORD} (all demo users share this password).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
