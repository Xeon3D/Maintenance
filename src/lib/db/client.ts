import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Dev keeps one client on globalThis across hot reloads. It's keyed on the PrismaClient class, so after
// `prisma generate` (a new class once the dev server reloads the generated code) a fresh client is
// created instead of the stale one, with no dev-server restart.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

function devClient() {
  if (globalForPrisma.prisma && globalForPrisma.prismaClass === PrismaClient) return globalForPrisma.prisma;
  void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  const client = createClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaClass = PrismaClient;
  return client;
}

/**
 * Unscoped client. Only use for cross-tenant work: auth, sign-up, invitations,
 * public QR lookups and background jobs. Everything else goes through `tenantDb()`.
 */
export const prisma = process.env.NODE_ENV === "production" ? createClient() : devClient();
