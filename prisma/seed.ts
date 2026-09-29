// Demo data (see src/lib/demo-seed.ts). Run with `npm run db:seed`. Safe to re-run: it skips if the demo owner exists.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_OWNER, DEMO_PASSWORD, seedDemo } from "../src/lib/demo-seed";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

seedDemo(prisma)
  .then((created) =>
    console.log(created ? `Seeded the demo organization. Sign in with ${DEMO_OWNER} / ${DEMO_PASSWORD} (all demo users share this password).` : "Demo data already present, skipping."),
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
