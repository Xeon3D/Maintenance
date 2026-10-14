import type { ContractStatus, SystemType, WorkOrderStatus } from "@/generated/prisma/enums";
import { addSlaTime, holdPeriods, parseBusinessHours, type BusinessHours, type Clock } from "@/lib/sla-clock";

// Service-level agreements. Pure: used by the WO page, contract pages, reports and tests.
// Targets count from when the work order was opened: around the clock, or only within the company's
// business hours (`businessHoursOnly`), optionally stopping while the job is on hold (`pauseOnHold`).

export type SlaState = "met" | "breached" | "pending" | "paused" | "na";
const HOUR = 3_600_000;

type Wo = {
  createdAt: Date;
  status: WorkOrderStatus;
  firstResponseAt: Date | null;
  completedAt: Date | null;
  /** Status changes into/out of ON_HOLD; only needed for contracts that pause on hold. */
  statusLogs?: { toStatus: WorkOrderStatus; createdAt: Date }[];
};
type Terms = { responseTimeHours: number | null; resolutionTimeHours: number | null; businessHoursOnly?: boolean; pauseOnHold?: boolean };
/** The company's calendar: its time zone and business hours. */
export type SlaCalendar = { timeZone: string; hours: BusinessHours };
export const slaCalendar = (org: { timezone: string; businessHours: unknown }): SlaCalendar => ({ timeZone: org.timezone, hours: parseBusinessHours(org.businessHours) });

/** Prisma `include` for the status changes the SLA clock needs (on-hold periods). */
export const SLA_STATUS_LOGS = {
  where: { OR: [{ toStatus: "ON_HOLD" as const }, { fromStatus: "ON_HOLD" as const }] },
  select: { toStatus: true, createdAt: true },
  orderBy: { createdAt: "asc" as const },
};

export function slaClock(wo: Pick<Wo, "statusLogs">, terms: Terms | null, calendar?: SlaCalendar): Clock {
  return {
    timeZone: calendar?.timeZone ?? "UTC",
    hours: terms?.businessHoursOnly && calendar ? calendar.hours : null,
    pauses: terms?.pauseOnHold ? holdPeriods(wo.statusLogs ?? []) : [],
  };
}

/** Due dates; null when there's no target, or the clock is stopped (on hold) before the target is reached. */
export function slaDue(wo: Pick<Wo, "createdAt" | "statusLogs">, terms: Terms | null, calendar?: SlaCalendar) {
  const clock = slaClock(wo, terms, calendar);
  const due = (h: number | null | undefined) => (h != null ? addSlaTime(wo.createdAt, h * HOUR, clock) : null);
  return { responseDue: due(terms?.responseTimeHours), resolutionDue: due(terms?.resolutionTimeHours) };
}

function judge(hasTarget: boolean, due: Date | null, doneAt: Date | null, status: WorkOrderStatus, now: Date): SlaState {
  if (!hasTarget || status === "CANCELLED") return "na";
  if (doneAt) return due && doneAt <= due ? "met" : due ? "breached" : "met"; // finished while the clock was stopped
  if (!due) return "paused";
  return now > due ? "breached" : "pending";
}

/** First response (someone started work) and resolution (done) against the contract's targets. */
export function slaStates(wo: Wo, terms: Terms | null, now = new Date(), calendar?: SlaCalendar) {
  const { responseDue, resolutionDue } = slaDue(wo, terms, calendar);
  // Finishing a job also counts as responding to it.
  const responded = wo.firstResponseAt ?? wo.completedAt;
  return {
    responseDue,
    resolutionDue,
    response: judge(terms?.responseTimeHours != null, responseDue, responded, wo.status, now),
    resolution: judge(terms?.resolutionTimeHours != null, resolutionDue, wo.status === "DONE" ? wo.completedAt : null, wo.status, now),
  };
}

/** Share met among decided (met + breached); pending, paused and n/a don't count either way. */
export function compliance(states: SlaState[]) {
  const met = states.filter((s) => s === "met").length;
  const breached = states.filter((s) => s === "breached").length;
  const pending = states.filter((s) => s === "pending" || s === "paused").length;
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

/**
 * Whether a contract covers a job at a villa, for a system, opened at `at`. `clientIds` are the villa's
 * owner and, if any, its property manager: a contract with either can cover the villa.
 */
export function covers(c: ContractLike, job: { villaId: string; clientIds: string[]; system: SystemType | null; at: Date }) {
  if (c.status !== "ACTIVE" && c.status !== "EXPIRED") return false; // drafts and cancelled never apply
  if (!job.clientIds.includes(c.clientId)) return false;
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
