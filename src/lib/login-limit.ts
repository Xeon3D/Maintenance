import { AttemptLimiter } from "@/lib/attempt-limit";

// Brute-force protection for sign-in (GDPR art. 32). Two independent limits over 15 minutes:
// failures per account (any address) and per client address (any account). No global cap, so an
// attacker can't lock everyone out; a locked account still unlocks on its own after the window.

const perAccount = new AttemptLimiter(10, Infinity);
const perAddress = new AttemptLimiter(30, Infinity);

const accountKey = (email: string) => `e:${email.toLowerCase().trim()}`;

export function loginBlocked(email: string, address: string, now = Date.now()) {
  return perAccount.blocked(accountKey(email), now) || perAddress.blocked(address, now);
}

export function recordLoginFailure(email: string, address: string, now = Date.now()) {
  perAccount.fail(accountKey(email), now);
  perAddress.fail(address, now);
}

/** A successful sign-in clears the account's count (not the address's: one office may share an IP). */
export function recordLoginSuccess(email: string) {
  perAccount.clear(accountKey(email));
}

export function resetLoginLimits() {
  perAccount.reset();
  perAddress.reset();
}

/** First address in X-Forwarded-For (set by the reverse proxy), else X-Real-IP. */
export function addressFrom(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
