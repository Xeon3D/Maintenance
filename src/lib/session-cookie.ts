// Reading and renewing the Auth.js session cookie in proxy.ts without Auth.js's middleware wrapper.
// The wrapper re-issued the session cookie on *every* response — including link prefetches and polling —
// so a response that was in flight when someone signed out (or signed in as someone else) arrived after
// the change and put the previous session back. Here the proxy only reads the token, and renews it on
// full page loads once it is a day old.

/** Same rule Auth.js uses: AUTH_URL's protocol, else X-Forwarded-Proto (set by the reverse proxy), else the request's. */
export function usesSecureCookie(headers: Headers, requestProtocol: string) {
  const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const protocol = envUrl ? new URL(envUrl).protocol : (headers.get("x-forwarded-proto") ?? requestProtocol);
  return protocol.startsWith("https");
}

export const sessionCookieName = (secure: boolean) => `${secure ? "__Secure-" : ""}authjs.session-token`;

/** Auth.js's default session lifetime (30 days); renewing restarts it. */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
/** Renew at most once a day per session. */
export const RENEW_AFTER = 24 * 60 * 60;

/**
 * Only top-level page loads renew the session: never prefetches, client-side navigations (RSC), polling or
 * API calls, which can still be in flight when the session changes.
 */
export function isPageLoad(method: string, headers: Headers) {
  return method === "GET" && headers.get("sec-fetch-dest") === "document" && !headers.get("rsc") && !headers.get("next-router-prefetch");
}

export function needsRenewal(issuedAt: unknown, now = Math.floor(Date.now() / 1000)) {
  return typeof issuedAt === "number" && now - issuedAt > RENEW_AFTER;
}

/** The Auth.js session cookie, in either name, including chunks ("….0", "….1") of a large token. */
export const isSessionCookie = (name: string) => /^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(name);

/** Options that delete a session cookie (a "__Secure-" cookie can only be changed with `secure`). */
export const expiredSessionCookie = (name: string) => ({ path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" as const, secure: name.startsWith("__Secure-") });
