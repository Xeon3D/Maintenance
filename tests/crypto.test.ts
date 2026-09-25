import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptField, encryptField } from "@/lib/crypto";

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("field encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const secret = "Gate: 4821# / Alarm: 1990";
    const a = encryptField(secret);
    const b = encryptField(secret);
    expect(a).not.toEqual(b);
    expect(decryptField(a)).toBe(secret);
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptField("hello").split(".");
    parts[3] = Buffer.from("jello").toString("base64url");
    expect(() => decryptField(parts.join("."))).toThrow();
  });
});
