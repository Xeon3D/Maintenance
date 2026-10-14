import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL, emailSettingsReady, normalizeEmailSettings, validFrom } from "@/lib/email-settings";

describe("e-mail settings", () => {
  it("falls back to the environment, with sensible SMTP defaults", () => {
    expect(normalizeEmailSettings(undefined)).toEqual(DEFAULT_EMAIL);
    expect(normalizeEmailSettings({ provider: "fax", smtp: { port: 99999, security: "weird" } })).toEqual(DEFAULT_EMAIL);
  });

  it("keeps valid values", () => {
    const s = normalizeEmailSettings({ provider: "smtp", from: " A <a@b.pt> ", smtp: { host: "smtp.office365.com", port: 465, security: "ssl", user: "a@b.pt", passwordEnc: "v1.x.y.z" } });
    expect(s).toMatchObject({ provider: "smtp", from: "A <a@b.pt>", smtp: { host: "smtp.office365.com", port: 465, security: "ssl", user: "a@b.pt", passwordEnc: "v1.x.y.z" } });
  });

  it("accepts plain or named sender addresses", () => {
    expect(validFrom("maintenance@company.pt")).toBe(true);
    expect(validFrom("Manutenção DC <manutencao@company.pt>")).toBe(true);
    expect(validFrom("Company")).toBe(false);
    expect(validFrom("a@b")).toBe(false);
  });

  it("is ready only when the chosen provider has what it needs", () => {
    const base = { ...DEFAULT_EMAIL, from: "a@b.pt" };
    expect(emailSettingsReady(base)).toBe(false); // "env": the environment decides
    expect(emailSettingsReady({ ...base, provider: "smtp" })).toBe(false);
    expect(emailSettingsReady({ ...base, provider: "smtp", smtp: { ...base.smtp, host: "mail.b.pt" } })).toBe(true);
    expect(emailSettingsReady({ ...base, provider: "resend" })).toBe(false);
    expect(emailSettingsReady({ ...base, provider: "resend", resend: { apiKeyEnc: "v1.x" } })).toBe(true);
    expect(emailSettingsReady({ ...base, from: "", provider: "resend", resend: { apiKeyEnc: "v1.x" } })).toBe(false);
  });
});
