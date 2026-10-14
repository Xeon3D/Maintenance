// How the server sends e-mail (Settings → Server). Pure: shared by the settings page, the action, the
// sender and tests. Passwords/API keys are stored encrypted (encryptField) and never sent to the browser.
//  - "env":    as before — RESEND_API_KEY + EMAIL_FROM from the environment (or nothing).
//  - "smtp":   any SMTP account (Microsoft 365, Google Workspace, the domain's mail server…).
//  - "resend": Resend's HTTP API with a key entered here.

export const EMAIL_PROVIDERS = ["env", "smtp", "resend"] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
export const SMTP_SECURITY = ["starttls", "ssl", "none"] as const;
export type SmtpSecurity = (typeof SMTP_SECURITY)[number];

export type EmailSettings = {
  provider: EmailProvider;
  /** Sender, e.g. "Maintenance <maintenance@example.com>". */
  from: string;
  smtp: { host: string; port: number; security: SmtpSecurity; user: string; passwordEnc: string | null };
  resend: { apiKeyEnc: string | null };
};

export const DEFAULT_EMAIL: EmailSettings = {
  provider: "env",
  from: "",
  smtp: { host: "", port: 587, security: "starttls", user: "", passwordEnc: null },
  resend: { apiKeyEnc: null },
};

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function normalizeEmailSettings(raw: unknown): EmailSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const smtp = o.smtp && typeof o.smtp === "object" ? (o.smtp as Record<string, unknown>) : {};
  const resend = o.resend && typeof o.resend === "object" ? (o.resend as Record<string, unknown>) : {};
  const port = Number(smtp.port);
  return {
    provider: oneOf(o.provider, EMAIL_PROVIDERS, "env"),
    from: str(o.from),
    smtp: {
      host: str(smtp.host, 255),
      port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587,
      security: oneOf(smtp.security, SMTP_SECURITY, "starttls"),
      user: str(smtp.user),
      passwordEnc: typeof smtp.passwordEnc === "string" && smtp.passwordEnc ? smtp.passwordEnc : null,
    },
    resend: { apiKeyEnc: typeof resend.apiKeyEnc === "string" && resend.apiKeyEnc ? resend.apiKeyEnc : null },
  };
}

/** A sender address, plain ("a@b.pt") or with a name ("Company <a@b.pt>"). */
export function validFrom(from: string) {
  const m = /^(?:[^<>]{1,100}<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,})>|([^\s<>@]+@[^\s<>@]+\.[^\s<>@]{2,}))$/.exec(from.trim());
  return !!m;
}

/** Whether the settings here are complete enough to send (else the environment / dev outbox is used). */
export function emailSettingsReady(s: EmailSettings) {
  if (s.provider === "smtp") return !!s.smtp.host && validFrom(s.from);
  if (s.provider === "resend") return !!s.resend.apiKeyEnc && validFrom(s.from);
  return false;
}
