import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { decryptField } from "@/lib/crypto";
import { getServerSettings } from "@/lib/server-settings";
import { emailSettingsReady, type EmailSettings } from "@/lib/email-settings";

// Transactional email. Delivery is chosen in Settings → Server (lib/email-settings.ts): an SMTP account or
// Resend's HTTP API. Left on "environment", RESEND_API_KEY + EMAIL_FROM are used as before. With nothing set,
// development writes each email to .mail/ as an HTML file you can open; production logs a warning and drops it.

export type Attachment = { filename: string; content: Buffer };
export type Email = { to: string; subject: string; html: string; text: string; attachments?: Attachment[] };

type Delivery =
  | { kind: "smtp"; from: string; host: string; port: number; security: EmailSettings["smtp"]["security"]; user: string; password: string | null }
  | { kind: "resend"; from: string; apiKey: string; source: "settings" | "env" }
  | { kind: "none" };

const DEV_OUTBOX = path.join(process.cwd(), ".mail");

/** The delivery in effect: Settings → Server first, then the environment. */
async function delivery(): Promise<Delivery> {
  const s = (await getServerSettings()).email;
  if (emailSettingsReady(s)) {
    if (s.provider === "smtp") {
      return { kind: "smtp", from: s.from, host: s.smtp.host, port: s.smtp.port, security: s.smtp.security, user: s.smtp.user, password: s.smtp.passwordEnc ? decryptField(s.smtp.passwordEnc) : null };
    }
    if (s.provider === "resend" && s.resend.apiKeyEnc) return { kind: "resend", from: s.from, apiKey: decryptField(s.resend.apiKeyEnc), source: "settings" };
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) return { kind: "resend", from, apiKey: key, source: "env" };
  return { kind: "none" };
}

/** Whether e-mail can actually go out (always "yes" in development, where it lands in .mail/). */
export async function emailConfigured() {
  return (await delivery()).kind !== "none" || process.env.NODE_ENV !== "production";
}

/** What Settings → Server shows: how mail goes out right now. */
export async function deliveryStatus(): Promise<{ kind: "smtp"; host: string } | { kind: "resend"; source: "settings" | "env" } | { kind: "none" }> {
  const d = await delivery();
  return d.kind === "smtp" ? { kind: "smtp", host: d.host } : d.kind === "resend" ? { kind: "resend", source: d.source } : { kind: "none" };
}

// One SMTP connection pool per configuration (rebuilt when the settings change).
let smtp: { key: string; transporter: Transporter } | null = null;
function smtpTransport(d: Extract<Delivery, { kind: "smtp" }>) {
  const key = JSON.stringify([d.host, d.port, d.security, d.user, d.password]);
  if (smtp?.key !== key) {
    smtp?.transporter.close();
    smtp = {
      key,
      transporter: nodemailer.createTransport({
        host: d.host,
        port: d.port,
        secure: d.security === "ssl",
        requireTLS: d.security === "starttls",
        ignoreTLS: d.security === "none",
        auth: d.user ? { user: d.user, pass: d.password ?? "" } : undefined,
        pool: true,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }),
    };
  }
  return smtp.transporter;
}

async function deliver(d: Delivery, email: Email) {
  if (d.kind === "smtp") {
    await smtpTransport(d).sendMail({
      from: d.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    return;
  }
  if (d.kind === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${d.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: d.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.attachments?.length ? { attachments: email.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Email provider error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(`[email] not configured; dropped "${email.subject}" to ${email.to}`);
    return;
  }
  await mkdir(DEV_OUTBOX, { recursive: true });
  const slug = email.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const file = path.join(DEV_OUTBOX, `${new Date().toISOString().replace(/[:.]/g, "-")}-${slug}.html`);
  await writeFile(file, `<!-- To: ${esc(email.to)} | Subject: ${esc(email.subject)} -->\n${email.html}`);
  for (const a of email.attachments ?? []) await writeFile(file.replace(/\.html$/, `-${a.filename}`), a.content);
  console.log(`[email] dev outbox: ${email.to} · ${email.subject} → ${path.relative(process.cwd(), file)}`);
}

export async function sendEmail(email: Email) {
  await deliver(await delivery(), email);
}

/**
 * Sends a test message with explicit settings (Settings → Server → "Send test e-mail"), so a configuration
 * can be checked before or after saving. Errors carry the provider's message (e.g. a rejected login).
 */
export async function sendTestEmail(settings: EmailSettings, to: string, content: Omit<Email, "to">) {
  if (!emailSettingsReady(settings)) throw new Error("incomplete");
  const d: Delivery =
    settings.provider === "smtp"
      ? { kind: "smtp", from: settings.from, host: settings.smtp.host, port: settings.smtp.port, security: settings.smtp.security, user: settings.smtp.user, password: settings.smtp.passwordEnc ? decryptField(settings.smtp.passwordEnc) : null }
      : { kind: "resend", from: settings.from, apiKey: decryptField(settings.resend.apiKeyEnc!), source: "settings" };
  if (d.kind === "smtp") {
    // A one-off connection, verified first, so a bad host/port/login reports clearly.
    const t = nodemailer.createTransport({ host: d.host, port: d.port, secure: d.security === "ssl", requireTLS: d.security === "starttls", ignoreTLS: d.security === "none", auth: d.user ? { user: d.user, pass: d.password ?? "" } : undefined, connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000 });
    try {
      await t.verify();
      await t.sendMail({ from: d.from, to, subject: content.subject, html: content.html, text: content.text });
    } finally {
      t.close();
    }
    return;
  }
  await deliver(d, { ...content, to });
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Minimal, client-safe HTML layout: heading, paragraphs, one button, small footer. */
export function emailLayout(o: {
  org: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer?: string;
  /** Link to the company's privacy notice, printed under the footer. */
  privacy?: { label: string; url: string };
  /** Absolute logo URL and brand colour (defaults to the app's blue). */
  logo?: string | null;
  color?: string;
}) {
  const color = o.color ?? "#1f4f8f";
  const p = o.paragraphs.map((x) => `<p style="margin:0 0 12px;line-height:1.5">${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
  const button = o.cta
    ? `<p style="margin:20px 0"><a href="${esc(o.cta.url)}" style="background:${esc(color)};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;font-weight:600">${esc(o.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:8px"><tr><td style="padding:24px">
${o.logo ? `<img src="${esc(o.logo)}" alt="${esc(o.org)}" height="40" style="display:block;height:40px;max-width:180px;margin-bottom:10px">` : ""}<div style="font-size:12px;font-weight:700;color:${esc(color)};text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">${esc(o.org)}</div>
<h1 style="font-size:18px;margin:0 0 14px">${esc(o.heading)}</h1>${p}${button}
${o.footer ? `<p style="margin:20px 0 0;font-size:12px;color:#6b7280">${esc(o.footer)}</p>` : ""}
${o.privacy ? `<p style="margin:12px 0 0;font-size:12px"><a href="${esc(o.privacy.url)}" style="color:#6b7280">${esc(o.privacy.label)}</a></p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [o.heading, "", ...o.paragraphs, ...(o.cta ? ["", `${o.cta.label}: ${o.cta.url}`] : []), ...(o.footer ? ["", o.footer] : []), ...(o.privacy ? ["", `${o.privacy.label}: ${o.privacy.url}`] : [])].join("\n");
  return { html, text };
}
