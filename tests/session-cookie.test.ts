import { afterEach, describe, expect, it, vi } from "vitest";
import { isPageLoad, needsRenewal, RENEW_AFTER, sessionCookieName, usesSecureCookie } from "@/lib/session-cookie";

afterEach(() => vi.unstubAllEnvs());

describe("session cookie name", () => {
  it("follows the reverse proxy's protocol, like Auth.js", () => {
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    expect(usesSecureCookie(new Headers({ "x-forwarded-proto": "https" }), "http:")).toBe(true);
    expect(usesSecureCookie(new Headers({ "x-forwarded-proto": "http" }), "https:")).toBe(false);
    expect(usesSecureCookie(new Headers(), "http:")).toBe(false);
    expect(sessionCookieName(true)).toBe("__Secure-authjs.session-token");
    expect(sessionCookieName(false)).toBe("authjs.session-token");
  });

  it("uses AUTH_URL when it is set", () => {
    vi.stubEnv("AUTH_URL", "https://maintenance.example.com");
    expect(usesSecureCookie(new Headers({ "x-forwarded-proto": "http" }), "http:")).toBe(true);
  });
});

describe("session renewal", () => {
  it("happens only on full page loads, never on prefetches, RSC navigations or API calls", () => {
    expect(isPageLoad("GET", new Headers({ "sec-fetch-dest": "document" }))).toBe(true);
    expect(isPageLoad("GET", new Headers({ "sec-fetch-dest": "empty", rsc: "1", "next-router-prefetch": "1" }))).toBe(false);
    expect(isPageLoad("GET", new Headers({ "sec-fetch-dest": "empty", rsc: "1" }))).toBe(false);
    expect(isPageLoad("POST", new Headers({ "sec-fetch-dest": "document" }))).toBe(false); // server actions
    expect(isPageLoad("GET", new Headers())).toBe(false); // fetch() / polling
  });

  it("waits until the token is a day old", () => {
    const now = 2_000_000_000;
    expect(needsRenewal(now - 60, now)).toBe(false);
    expect(needsRenewal(now - RENEW_AFTER - 1, now)).toBe(true);
    expect(needsRenewal(undefined, now)).toBe(false);
  });
});

describe("proxy", () => {
  const secret = "test-secret-for-the-proxy-test-0123456789";
  const name = "authjs.session-token";

  async function request(path: string, cookie: string | null, headers: Record<string, string> = {}) {
    const { NextRequest } = await import("next/server");
    return new NextRequest(`http://app.test${path}`, { headers: { ...(cookie ? { cookie: `${name}=${cookie}` } : {}), ...headers } });
  }

  async function tokenIssuedAt(daysAgo: number) {
    const { encode } = await import("next-auth/jwt");
    vi.useFakeTimers({ now: Date.now() - daysAgo * 86_400_000 });
    try {
      return await encode({ token: { sub: "user-1", email: "a@b.pt" }, secret, salt: name, maxAge: 30 * 86_400 });
    } finally {
      vi.useRealTimers();
    }
  }

  it("redirects without a session and never rewrites the cookie on prefetches", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const { default: proxy } = await import("@/proxy");
    expect((await proxy(await request("/work-orders", null))).headers.get("location")).toContain("/login?next=%2Fwork-orders");

    const old = await tokenIssuedAt(2);
    const prefetch = await proxy(await request("/assets", old, { rsc: "1", "next-router-prefetch": "1" }));
    expect(prefetch.headers.get("location")).toBeNull();
    expect(prefetch.headers.get("set-cookie")).toBeNull();
  });

  it("renews a day-old session on a full page load, keeping the same user", async () => {
    vi.stubEnv("AUTH_SECRET", secret);
    const { default: proxy } = await import("@/proxy");
    const { decode } = await import("next-auth/jwt");

    const fresh = await proxy(await request("/dashboard", await tokenIssuedAt(0), { "sec-fetch-dest": "document" }));
    expect(fresh.headers.get("set-cookie")).toBeNull();

    const res = await proxy(await request("/dashboard", await tokenIssuedAt(2), { "sec-fetch-dest": "document" }));
    const renewed = res.cookies.get(name)?.value;
    expect(renewed).toBeTruthy();
    const claims = await decode({ token: renewed!, secret, salt: name });
    expect(claims?.sub).toBe("user-1");
    expect(Math.abs((claims!.iat as number) - Date.now() / 1000)).toBeLessThan(60);
  });
});

describe("clearing a stale session", () => {
  it("recognises the session cookie in every form, and nothing else", async () => {
    const { isSessionCookie, expiredSessionCookie } = await import("@/lib/session-cookie");
    for (const n of ["authjs.session-token", "__Secure-authjs.session-token", "authjs.session-token.0", "__Secure-authjs.session-token.1"]) expect(isSessionCookie(n)).toBe(true);
    for (const n of ["authjs.callback-url", "authjs.session-tokenx", "active_org", "server_admin"]) expect(isSessionCookie(n)).toBe(false);
    expect(expiredSessionCookie("__Secure-authjs.session-token")).toMatchObject({ maxAge: 0, secure: true });
  });

  it("the clear route deletes the session cookies and goes to sign-in", async () => {
    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/session/clear/route");
    const res = GET(new NextRequest("http://app.test/session/clear", { headers: { cookie: "authjs.session-token=abc; active_org=o1; __Secure-authjs.session-token=def" } }));
    expect(res.headers.get("location")).toBe("/login"); // relative: behind a proxy req.url is the internal address
    const cleared = res.headers.getSetCookie().map((c) => c.split("=")[0]);
    expect(cleared.sort()).toEqual(["__Secure-authjs.session-token", "authjs.session-token"]);
  });
});

describe("in-app redirects", () => {
  it("are relative and never leave the app", async () => {
    const { redirectTo } = await import("@/lib/redirect");
    expect(redirectTo("/login").headers.get("location")).toBe("/login");
    expect(redirectTo("//evil.example/x").headers.get("location")).toBe("/");
    expect(redirectTo("https://evil.example").headers.get("location")).toBe("/");
    expect(redirectTo("/a", 303).status).toBe(303);
  });
});
