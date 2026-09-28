import "server-only";
import type { TenantDb } from "@/lib/db/tenant";
import { pickContract } from "@/lib/sla";
import type { SystemType } from "@/generated/prisma/enums";

// Work orders are linked to the service contract that covers them automatically (villa, client,
// dates, systems), so SLA reporting needs no manual tagging.

const contractFields = { id: true, clientId: true, villaId: true, status: true, startDate: true, endDate: true, systems: true } as const;

/** The contract covering a job at `villaId` for `system`, opened at `at` (or null). */
export async function contractFor(db: TenantDb, villaId: string | null, system: SystemType | null, at = new Date()) {
  if (!villaId) return null;
  const villa = await db.villa.findUnique({ where: { id: villaId }, select: { clientId: true } });
  if (!villa) return null;
  const contracts = await db.serviceContract.findMany({ where: { clientId: villa.clientId }, select: contractFields });
  return pickContract(contracts, { villaId, clientId: villa.clientId, system, at })?.id ?? null;
}

/**
 * Re-evaluates which contract each of a client's work orders falls under. Run after contracts
 * are created, edited or deleted, so earlier jobs are (re)attributed too.
 */
export async function relinkClientWorkOrders(db: TenantDb, clientId: string) {
  const contracts = await db.serviceContract.findMany({ where: { clientId }, select: contractFields });
  const wos = await db.workOrder.findMany({
    where: { villa: { clientId } },
    select: { id: true, villaId: true, system: true, createdAt: true, contractId: true },
  });
  const changes = new Map<string | null, string[]>();
  for (const wo of wos) {
    const next = pickContract(contracts, { villaId: wo.villaId!, clientId, system: wo.system, at: wo.createdAt })?.id ?? null;
    if (next !== wo.contractId) changes.set(next, [...(changes.get(next) ?? []), wo.id]);
  }
  for (const [contractId, ids] of changes) await db.workOrder.updateMany({ where: { id: { in: ids } }, data: { contractId } });
  return [...changes.values()].reduce((n, ids) => n + ids.length, 0);
}
