import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Closing public sign-up: lib/signup.ts and the refusal in the sign-up / create-company server actions.

const settings = { allowSignup: true };
const prisma = {
  invitation: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn() },
};
const createOrganization = vi.fn();
const signIn = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ prisma }));
vi.mock("@/lib/server-settings", () => ({ getServerSettings: async () => settings, getAppName: async () => "VillaOps" }));
vi.mock("@/auth", () => ({ auth: vi.fn(), signIn, signOut: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class extends Error {}, CredentialsSignin: class extends Error {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn(), delete: vi.fn() }), headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/org", () => ({ createOrganization }));
vi.mock("@/lib/context", () => ({ ACTIVE_ORG_COOKIE: "org", requireUser: async () => ({ id: "u1", locale: "en" }) }));
vi.mock("@/lib/qr", () => ({ appOrigin: async () => "http://localhost" }));
vi.mock("@/lib/email", () => ({ emailLayout: vi.fn(), sendEmail: vi.fn() }));
vi.mock("@/lib/notify", () => ({ background: vi.fn() }));
vi.mock("@/lib/password-reset", () => ({}));
vi.mock("@/lib/audit", () => ({ auditUser: vi.fn(), writeAudit: vi.fn() }));
vi.mock("@/lib/factory-reset", () => ({}));

const { inviteToken, signupAllowed, signupLockedByEnv, signupOpen } = await import("@/lib/signup");
const { createOrgAction, signupAction } = await import("@/app/(auth)/actions");

const TOKEN = "abcdefghijklmnopqrstuvwxyz012345";
const pending = { email: "new@villa.pt", acceptedAt: null, expiresAt: new Date(Date.now() + 86_400_000) };

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const owner = { name: "Stranger", company: "Acme", email: "stranger@example.com", password: "password123" };
const invited = { name: "New Tech", email: "new@villa.pt", password: "password123", next: `/invite/${TOKEN}` };

beforeEach(() => {
  settings.allowSignup = true;
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.user.create.mockResolvedValue({ id: "u2" });
  createOrganization.mockResolvedValue({ id: "o2" });
});
afterEach(() => vi.unstubAllEnvs());

describe("ALLOW_SIGNUP", () => {
  it("only false/0/no/off close sign-up", () => {
    for (const v of ["false", "FALSE", "0", "no", " off "]) expect(signupLockedByEnv(v)).toBe(true);
    for (const v of [undefined, "", "true", "1", "yes"]) expect(signupLockedByEnv(v)).toBe(false);
  });

  it("overrides the setting", async () => {
    expect(await signupOpen()).toBe(true);
    vi.stubEnv("ALLOW_SIGNUP", "false");
    expect(await signupOpen()).toBe(false);
  });
});

describe("signupAllowed", () => {
  it("lets everything through while open", async () => {
    expect(await signupAllowed({ email: owner.email, company: "Acme" })).toBe(true);
    expect(prisma.invitation.findUnique).not.toHaveBeenCalled();
  });

  it("while closed, allows only an account for a pending invitation's address", async () => {
    settings.allowSignup = false;
    prisma.invitation.findUnique.mockResolvedValue(pending);
    expect(await signupAllowed({ email: "new@villa.pt", next: `/invite/${TOKEN}` })).toBe(true);
    expect(await signupAllowed({ email: "NEW@villa.pt", next: `/invite/${TOKEN}` })).toBe(true);
    expect(await signupAllowed({ email: "other@villa.pt", next: `/invite/${TOKEN}` })).toBe(false);
    expect(await signupAllowed({ email: "new@villa.pt", company: "Acme", next: `/invite/${TOKEN}` })).toBe(false);
    expect(await signupAllowed({ email: "new@villa.pt" })).toBe(false);
    expect(await signupAllowed({ email: "new@villa.pt", next: "/dashboard" })).toBe(false);

    prisma.invitation.findUnique.mockResolvedValue({ ...pending, acceptedAt: new Date() });
    expect(await signupAllowed({ email: "new@villa.pt", next: `/invite/${TOKEN}` })).toBe(false);
    prisma.invitation.findUnique.mockResolvedValue({ ...pending, expiresAt: new Date(Date.now() - 1000) });
    expect(await signupAllowed({ email: "new@villa.pt", next: `/invite/${TOKEN}` })).toBe(false);
    prisma.invitation.findUnique.mockResolvedValue(null);
    expect(await signupAllowed({ email: "new@villa.pt", next: `/invite/${TOKEN}` })).toBe(false);
  });

  it("reads the token only from an /invite/ path", () => {
    expect(inviteToken(`/invite/${TOKEN}`)).toBe(TOKEN);
    expect(inviteToken(`/invite/${TOKEN}/x`)).toBeNull();
    expect(inviteToken(`//evil/invite/${TOKEN}`)).toBeNull();
    expect(inviteToken(undefined)).toBeNull();
  });
});

describe("signupAction", () => {
  it("creates the user and company while open", async () => {
    expect(await signupAction(undefined, form(owner))).toBeUndefined();
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(createOrganization).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledOnce();
  });

  it("refuses a new company while closed by the setting", async () => {
    settings.allowSignup = false;
    expect(await signupAction(undefined, form(owner))).toEqual({ error: "signupClosed" });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(createOrganization).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("refuses while closed by ALLOW_SIGNUP even if the setting is on", async () => {
    vi.stubEnv("ALLOW_SIGNUP", "false");
    expect(await signupAction(undefined, form(owner))).toEqual({ error: "signupClosed" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("refuses an account with a made-up invitation while closed", async () => {
    settings.allowSignup = false;
    prisma.invitation.findUnique.mockResolvedValue(null);
    expect(await signupAction(undefined, form(invited))).toEqual({ error: "signupClosed" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("still creates an invited person's account while closed", async () => {
    settings.allowSignup = false;
    prisma.invitation.findUnique.mockResolvedValue(pending);
    expect(await signupAction(undefined, form(invited))).toBeUndefined();
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(createOrganization).not.toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ redirectTo: `/invite/${TOKEN}` }));
  });
});

describe("createOrgAction", () => {
  it("refuses a new company while closed", async () => {
    settings.allowSignup = false;
    expect(await createOrgAction(undefined, form({ company: "Acme" }))).toEqual({ error: "signupClosed" });
    expect(createOrganization).not.toHaveBeenCalled();
  });
});
