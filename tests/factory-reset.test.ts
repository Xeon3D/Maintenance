import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));
vi.mock("@/lib/storage", () => ({ clearAllObjects: vi.fn() }));
vi.mock("@/lib/demo-seed", () => ({ seedDemo: vi.fn() }));

const { checkFactoryResetPassword, factoryResetBlocked, factoryResetEnabled, recordFactoryResetFailure } = await import("@/lib/factory-reset");

afterEach(() => vi.unstubAllEnvs());

describe("factory reset password", () => {
  it("is disabled without FACTORY_RESET_PASSWORD", () => {
    vi.stubEnv("FACTORY_RESET_PASSWORD", "");
    expect(factoryResetEnabled()).toBe(false);
    expect(checkFactoryResetPassword("")).toBe(false);
  });

  it("accepts only the exact password", () => {
    vi.stubEnv("FACTORY_RESET_PASSWORD", "s3cret-Reset!");
    expect(factoryResetEnabled()).toBe(true);
    expect(checkFactoryResetPassword("s3cret-Reset!")).toBe(true);
    expect(checkFactoryResetPassword("s3cret-reset!")).toBe(false);
    expect(checkFactoryResetPassword("s3cret-Reset! ")).toBe(false);
    expect(checkFactoryResetPassword("")).toBe(false);
  });
});

describe("attempt limit", () => {
  it("blocks a client after 5 failures for 15 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(factoryResetBlocked("1.2.3.4", t0)).toBe(false);
      recordFactoryResetFailure("1.2.3.4", t0);
    }
    expect(factoryResetBlocked("1.2.3.4", t0 + 1000)).toBe(true);
    expect(factoryResetBlocked("5.6.7.8", t0 + 1000)).toBe(false);
    expect(factoryResetBlocked("1.2.3.4", t0 + 15 * 60_000 + 1)).toBe(false);
  });
});
