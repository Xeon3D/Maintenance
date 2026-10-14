import { beforeEach, describe, expect, it } from "vitest";
import { addressFrom, loginBlocked, recordLoginFailure, recordLoginSuccess, resetLoginLimits } from "@/lib/login-limit";
import { paragraphs } from "@/lib/privacy";

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

  it("reads the client address from proxy headers", () => {
    expect(addressFrom(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(addressFrom(new Headers({ "x-real-ip": "203.0.113.6" }))).toBe("203.0.113.6");
    expect(addressFrom(new Headers())).toBe("unknown");
  });
});

describe("privacy notice text", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(paragraphs("One\nline two\n\n\n  Two  \r\n\r\nThree")).toEqual(["One\nline two", "Two", "Three"]);
    expect(paragraphs("  \n\n ")).toEqual([]);
  });
});
