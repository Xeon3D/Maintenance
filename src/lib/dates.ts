const DAY = 86_400_000;

/** Whole days from now until `d` (negative if in the past). */
export function daysFromNow(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / DAY);
}
