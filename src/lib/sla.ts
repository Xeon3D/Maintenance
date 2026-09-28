import type { ContractStatus, SystemType, WorkOrderStatus } from "@/generated/prisma/enums";

// Service-level agreements. Pure: used by the WO page, contract pages, reports and tests.
// Targets are calendar hours from when the work order was opened (no business-hours calendar).

export type SlaState = "met" | "breached" | "pending" | "na";
const HOUR = 3_600_000;

type Wo = { createdAt: Date; status: WorkOrderStatus; firstResponseAt: Date | null; completedAt: Date | null };
type Terms = { responseTimeHours: number | null; resolutionTimeHours: number | null };

export function slaDue(wo: { createdAt: Date }, terms: Terms | null) {
  return {
    responseDue: terms?.responseTimeHours != null ? new Date(wo.createdAt.getTime() + terms.responseTimeHours * HOUR) : null,
    resolutionDue: terms?.resolutionTimeHours != null ? new Date(wo.createdAt.getTime() + terms.resolutionTimeHours * HOUR) : null,
  };
}

function judge(due: Date | null, doneAt: Date | null, status: WorkOrderStatus, now: Date): SlaState {
  if (!due || status === "CANCELLED") return "na";
  if (doneAt) return doneAt <= due ? "met" : "breached";
  return now > due ? "breached" : "pending";
}

/** First response (someone started work) and resolution (done) against the contract's targets. */
export function slaStates(wo: Wo, terms: Terms | null, now = new Date()) {
  const { responseDue, resolutionDue } = slaDue(wo, terms);
  // Finishing a job also counts as responding to it.
  const responded = wo.firstResponseAt ?? wo.completedAt;
  return {
    responseDue,
    resolutionDue,
    response: judge(responseDue, responded, wo.status, now),
    resolution: judge(resolutionDue, wo.status === "DONE" ? wo.completedAt : null, wo.status, now),
  };
}

/** Share met among decided (met + breached); pending and n/a don't count either way. */
export function compliance(states: SlaState[]) {
  const met = states.filter((s) => s === "met").length;
  const breached = states.filter((s) => s === "breached").length;
  const pending = states.filter((s) => s === "pending").length;
  return { met, breached, pending, pct: met + breached ? met / (met + breached) : null };
}

export type ContractLike = {
  id: string;
  clientId: string;
  villaId: string | null;
  status: ContractStatus;
  startDate: Date;
  endDate: Date | null;
  systems: SystemType[];
};

/** Whether a contract covers a job at a villa (of a client), for a system, opened at `at`. */
export function covers(c: ContractLike, job: { villaId: string; clientId: string; system: SystemType | null; at: Date }) {
  if (c.status !== "ACTIVE" && c.status !== "EXPIRED") return false; // drafts and cancelled never apply
  if (c.clientId !== job.clientId) return false;
  if (c.villaId && c.villaId !== job.villaId) return false;
  if (job.at < c.startDate || (c.endDate && job.at > endOfDay(c.endDate))) return false;
  if (c.systems.length > 0 && (!job.system || !c.systems.includes(job.system))) return false;
  return true;
}

/** The contract a job falls under: villa-specific beats client-wide, then the most recent start. */
export function pickContract<C extends ContractLike>(contracts: C[], job: Parameters<typeof covers>[1]): C | null {
  const matching = contracts.filter((c) => covers(c, job));
  matching.sort((a, b) => Number(!!b.villaId) - Number(!!a.villaId) || b.startDate.getTime() - a.startDate.getTime());
  return matching[0] ?? null;
}

/** Contract end dates are whole days: a contract ending on the 31st covers the 31st. */
export function endOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** The contract's current year (anniversary-based) for counting included visits. */
export function contractYear(start: Date, now = new Date()) {
  let from = new Date(start);
  while (true) {
    const next = new Date(from);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    if (next > now) return { from, to: next };
    from = next;
  }
}
