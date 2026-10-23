import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma: {} }));

import { SEEN_THROTTLE_MS, shouldTouch } from "@/lib/online-users";

describe("last seen throttle", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  it("writes the first time and once the throttle has passed", () => {
    expect(shouldTouch(null, now)).toBe(true);
    expect(shouldTouch(new Date(now.getTime() - SEEN_THROTTLE_MS), now)).toBe(true);
  });
  it("skips requests within a minute of the last write", () => {
    expect(shouldTouch(new Date(now.getTime() - 30_000), now)).toBe(false);
    expect(shouldTouch(now, now)).toBe(false);
  });
});
