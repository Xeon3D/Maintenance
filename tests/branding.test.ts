import { describe, expect, it } from "vitest";
import { brandColor, brandStyle, companyLines, contrastWithWhite, DEFAULT_BRAND, logoSrc, normalizeHex } from "@/lib/branding";

describe("brand colour", () => {
  it("normalises hex input", () => {
    expect(normalizeHex("1F4F8F")).toBe("#1f4f8f");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("blue")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });

  it("measures contrast against white (WCAG)", () => {
    expect(contrastWithWhite("#000000")).toBeCloseTo(21, 0);
    expect(contrastWithWhite("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastWithWhite(DEFAULT_BRAND)).toBeGreaterThan(4.5);
  });

  it("falls back to the default when the saved colour is unreadable or missing", () => {
    expect(brandColor({ brandColor: "#0b6e4f" })).toBe("#0b6e4f");
    expect(brandColor({ brandColor: "#ffd400" })).toBe(DEFAULT_BRAND); // yellow: white text unreadable
    expect(brandColor({ brandColor: null })).toBe(DEFAULT_BRAND);
    expect(brandStyle({ brandColor: null })).toEqual({});
    expect(brandStyle({ brandColor: "#0b6e4f" })).toEqual({ "--brand": "#0b6e4f", "--color-brand": "#0b6e4f" });
  });
});

describe("letterhead lines", () => {
  it("prints legal name (if different), address lines, tax number and contacts", () => {
    const lines = companyLines(
      { name: "Demo", legalName: "Demo Integrations, Lda.", address: "Rua A, 1\n8135-000 Almancil\n", taxId: "509999999", phone: "+351 289 000 000", email: "geral@demo.pt", website: "https://demo.pt" },
      "NIF",
    );
    expect(lines).toEqual(["Demo Integrations, Lda.", "Rua A, 1", "8135-000 Almancil", "NIF: 509999999", "+351 289 000 000 · geral@demo.pt · demo.pt"]);
  });

  it("skips what's missing", () => {
    expect(companyLines({ name: "Demo", legalName: "Demo" }, "NIF")).toEqual([]);
  });
});

describe("logo URL", () => {
  it("is versioned by the last update and absent without a logo", () => {
    const updatedAt = new Date("2026-09-29T10:00:00Z");
    expect(logoSrc({ id: "o1", logoUrl: "local:x.png", updatedAt }, "https://app.example")).toBe(`https://app.example/api/org-logo/o1?v=${updatedAt.getTime()}`);
    expect(logoSrc({ id: "o1", logoUrl: null, updatedAt })).toBeNull();
  });
});
