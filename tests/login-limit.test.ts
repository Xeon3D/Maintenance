import { beforeEach, describe, expect, it } from "vitest";
import { addressFrom, loginBlocked, recordLoginFailure, recordLoginSuccess, resetLoginLimits } from "@/lib/login-limit";
import { paragraphs } from "@/lib/privacy";
import { AttemptLimiter, samePassword } from "@/lib/attempt-limit";
import { clientAddressFrom, proxyHops } from "@/lib/client-address";
import { isPublicPath } from "@/lib/public-paths";

const t0 = 1_000_000;
const MIN = 60_000;

beforeEach(() => resetLoginLimits());

describe("sign-in attempt limit", () => {
  it("locks an account after 10 failures from any addresses, for 15 minutes", () => {
    for (let i = 0; i < 10; i++) {
      expect(loginBlocked("ana@x.pt", `10.0.0.${i}`, t0)).toBe(false);
      recordLoginFailure("ana@x.pt", `10.0.0.${i}`, t0);
    }
    expect(loginBlocked("ana@x.pt", "10.9.9.9", t0 + 1000)).toBe(true);
    expect(loginBlocked(" ANA@x.pt ", "10.9.9.9", t0 + 1000)).toBe(true); // same account, normalised
    expect(loginBlocked("rui@x.pt", "10.9.9.9", t0 + 1000)).toBe(false); // other accounts unaffected
    expect(loginBlocked("ana@x.pt", "10.9.9.9", t0 + 15 * MIN + 1)).toBe(false);
  });

  it("locks an address after 30 failures across accounts", () => {
    for (let i = 0; i < 30; i++) recordLoginFailure(`user${i}@x.pt`, "1.2.3.4", t0);
    expect(loginBlocked("new@x.pt", "1.2.3.4", t0 + 1000)).toBe(true);
    expect(loginBlocked("new@x.pt", "5.6.7.8", t0 + 1000)).toBe(false);
  });

  it("clears the account count on a successful sign-in", () => {
    for (let i = 0; i < 9; i++) recordLoginFailure("ana@x.pt", "1.1.1.1", t0);
    recordLoginSuccess("ana@x.pt");
    recordLoginFailure("ana@x.pt", "1.1.1.1", t0);
    expect(loginBlocked("ana@x.pt", "2.2.2.2", t0)).toBe(false);
  });

  it("reads the client address our proxy added, not one the client sent", () => {
    // The client sent "X-Forwarded-For: 203.0.113.5"; the proxy appended the address it really came from.
    expect(addressFrom(new Headers({ "x-forwarded-for": "203.0.113.5, 198.51.100.7" }))).toBe("198.51.100.7");
    expect(addressFrom(new Headers({ "x-real-ip": "203.0.113.6" }))).toBe("203.0.113.6");
    expect(addressFrom(new Headers())).toBe("unknown");
  });

  it("can't be dodged by sending a new X-Forwarded-For each time", () => {
    for (let i = 0; i < 30; i++) {
      const address = addressFrom(new Headers({ "x-forwarded-for": `10.66.0.${i}, 198.51.100.7` }));
      recordLoginFailure(`user${i}@x.pt`, address, t0);
    }
    expect(loginBlocked("new@x.pt", addressFrom(new Headers({ "x-forwarded-for": "10.99.9.9, 198.51.100.7" })), t0 + 1000)).toBe(true);
  });
});

describe("client address", () => {
  const xff = (v: string) => new Headers({ "x-forwarded-for": v });

  it("counts trusted proxies from the right", () => {
    expect(clientAddressFrom(xff("1.1.1.1, 2.2.2.2, 3.3.3.3"), 1)).toBe("3.3.3.3");
    expect(clientAddressFrom(xff("1.1.1.1, 2.2.2.2, 3.3.3.3"), 2)).toBe("2.2.2.2");
    expect(clientAddressFrom(xff("2.2.2.2"), 2)).toBe("2.2.2.2"); // fewer entries than proxies: the oldest one
    expect(clientAddressFrom(xff(" , 3.3.3.3 ,"), 1)).toBe("3.3.3.3");
    expect(clientAddressFrom(new Headers(), 1)).toBeNull();
  });

  it("reads TRUSTED_PROXY_HOPS, defaulting to 1", () => {
    expect(proxyHops(undefined)).toBe(1);
    expect(proxyHops("2")).toBe(2);
    for (const bad of ["0", "-1", "1.5", "abc", ""]) expect(proxyHops(bad)).toBe(1);
  });
});

describe("attempt limiter memory", () => {
  it("drops expired keys instead of keeping one per address or e-mail ever seen", () => {
    const limiter = new AttemptLimiter(5, 30, 15 * MIN);
    for (let i = 0; i < 1000; i++) {
      expect(limiter.blocked(`probe-${i}`, t0)).toBe(false); // lookups alone store nothing
    }
    expect(limiter.size).toBe(0);
    for (let i = 0; i < 1000; i++) limiter.fail(`client-${i}`, t0);
    expect(limiter.size).toBe(1001); // 1000 clients + the global count
    limiter.fail("later", t0 + 15 * MIN + 1);
    expect(limiter.size).toBe(2); // "later" + the global count
    expect(limiter.blocked("client-1", t0 + 15 * MIN + 1)).toBe(false);
  });
});

describe("secret comparison", () => {
  it("compares any input without throwing (the cron check used to throw on non-ASCII input)", () => {
    expect(samePassword("s3cret", "s3cret")).toBe(true);
    expect(samePassword("s3cre", "s3cret")).toBe(false);
    expect(samePassword("s3crét", "s3cret")).toBe(false); // same length in characters, not in bytes
    expect(samePassword("", undefined)).toBe(false);
    expect(samePassword("", "")).toBe(false); // no secret configured: nothing is accepted
  });
});

describe("public paths", () => {
  it("matches each public route and the paths under it, not longer names", () => {
    for (const p of ["/login", "/privacy", "/privacy/en", "/r/abc", "/api/cron/pm", "/api/calendar/x.ics", "/sw.js", "/api/auth/session"]) {
      expect(isPublicPath(p), p).toBe(true);
    }
    for (const p of ["/privacy-x", "/loginx", "/termsheet", "/rx", "/api/versions", "/sw.jsx", "/dashboard", "/"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});

describe("privacy notice text", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(paragraphs("One\nline two\n\n\n  Two  \r\n\r\nThree")).toEqual(["One\nline two", "Two", "Three"]);
    expect(paragraphs("  \n\n ")).toEqual([]);
  });
});
