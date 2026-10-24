// Urgent work orders cost extra: a fixed amount plus a percentage of their labour. The company sets it in
// Settings → Organization; a service contract can set its own (e.g. none on a premium contract). The client's
// service report says the job was handled as urgent, without amounts.

export type UrgentRule = { fee: number; percent: number };
type Stored = { urgentFee: unknown; urgentPercent: number | null };

export const NO_SURCHARGE: UrgentRule = { fee: 0, percent: 0 };

/** The contract's own surcharge when it sets one (either field), else the company's. */
export function urgentRuleFor(org: Stored, contract?: Stored | null): UrgentRule {
  const own = contract && (contract.urgentFee != null || contract.urgentPercent != null) ? contract : org;
  return { fee: Number(own.urgentFee ?? 0), percent: Number(own.urgentPercent ?? 0) };
}

/** Whether a work order is charged the surcharge: urgent, with a surcharge that isn't zero. */
export const urgentApplies = (priority: string | null | undefined, rule: UrgentRule) => priority === "URGENT" && (rule.fee > 0 || rule.percent > 0);

/** The extra cost of a work order: fixed amount + percentage of its labour, when it is urgent. */
export function urgentSurcharge(priority: string | null | undefined, labor: number, rule: UrgentRule) {
  return urgentApplies(priority, rule) ? rule.fee + (labor * rule.percent) / 100 : 0;
}
