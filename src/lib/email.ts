import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Transactional email. With RESEND_API_KEY + EMAIL_FROM set, mail goes out through Resend's HTTP API
// (no SDK, so another provider is a small change here). Without them, development writes each email
// to .mail/ as an HTML file you can open; production logs a warning and drops it.

export type Email = { to: string; subject: string; html: string; text: string };

const DEV_OUTBOX = path.join(process.cwd(), ".mail");

export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
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
  console.log(`[email] dev outbox: ${email.to} · ${email.subject} → ${path.relative(process.cwd(), file)}`);
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Minimal, client-safe HTML layout: heading, paragraphs, one button, small footer. */
export function emailLayout(o: { org: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string }; footer?: string }) {
  const p = o.paragraphs.map((x) => `<p style="margin:0 0 12px;line-height:1.5">${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
  const button = o.cta
    ? `<p style="margin:20px 0"><a href="${esc(o.cta.url)}" style="background:#1f4f8f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;font-weight:600">${esc(o.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:8px"><tr><td style="padding:24px">
<div style="font-size:12px;font-weight:700;color:#1f4f8f;text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">${esc(o.org)}</div>
<h1 style="font-size:18px;margin:0 0 14px">${esc(o.heading)}</h1>${p}${button}
${o.footer ? `<p style="margin:20px 0 0;font-size:12px;color:#6b7280">${esc(o.footer)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [o.heading, "", ...o.paragraphs, ...(o.cta ? ["", `${o.cta.label}: ${o.cta.url}`] : []), ...(o.footer ? ["", o.footer] : [])].join("\n");
  return { html, text };
}
