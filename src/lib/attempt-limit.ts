import { createHash, timingSafeEqual } from "node:crypto";

// In-memory limit on failed password attempts: per client address plus a global cap, over a window.

export class AttemptLimiter {
  private failures = new Map<string, number[]>();
  private lastSweep = 0;
  constructor(
    private perClient = 5,
    private global = 30,
    private windowMs = 15 * 60_000,
  ) {}

  private recent(key: string, now: number) {
    return (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }

  /** Keys are chosen by clients (addresses, e-mails), so expired ones are dropped once per window. */
  private sweep(now: number) {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, list] of this.failures) {
      if (!list.some((t) => now - t < this.windowMs)) this.failures.delete(key);
    }
  }

  blocked(client: string, now = Date.now()) {
    return this.recent(client, now).length >= this.perClient || this.recent("*", now).length >= this.global;
  }

  fail(client: string, now = Date.now()) {
    this.sweep(now);
    for (const key of [client, "*"]) this.failures.set(key, [...this.recent(key, now), now]);
  }

  /** Number of keys held (for tests). */
  get size() {
    return this.failures.size;
  }

  /** Forgets one client's failures (e.g. after a successful sign-in). */
  clear(client: string) {
    this.failures.delete(client);
  }

  reset() {
    this.failures.clear();
  }
}

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** Constant-time comparison (equal-length digests, so the length doesn't leak either). */
export function samePassword(input: string, expected: string | null | undefined) {
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}
