import { createHash, timingSafeEqual } from "node:crypto";

// In-memory limit on failed password attempts: per client address plus a global cap, over a window.

export class AttemptLimiter {
  private failures = new Map<string, number[]>();
  constructor(
    private perClient = 5,
    private global = 30,
    private windowMs = 15 * 60_000,
  ) {}

  private recent(key: string, now: number) {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.failures.set(key, list);
    return list;
  }

  blocked(client: string, now = Date.now()) {
    return this.recent(client, now).length >= this.perClient || this.recent("*", now).length >= this.global;
  }

  fail(client: string, now = Date.now()) {
    this.recent(client, now).push(now);
    this.recent("*", now).push(now);
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
