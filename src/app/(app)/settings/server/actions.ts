"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { optStr, parseForm, type FormResult } from "@/lib/forms";
import { lockServerAdmin, requireServerAdmin, unlockServerAdmin } from "@/lib/server-admin";
import { getAppName, getServerSettings, updateServerSettings } from "@/lib/server-settings";
import { normalizeSchedule, validTimezone } from "@/lib/backup-schedule";
import { BackupError, createBackup, deleteBackup, restartSoon, restoreBackup, updateNow } from "@/lib/backups";
import { checkForUpdate, updaterConfigured } from "@/lib/updates";
import { getTranslations } from "next-intl/server";
import { encryptField } from "@/lib/crypto";
import { emailLayout, sendTestEmail } from "@/lib/email";
import { EMAIL_PROVIDERS, SMTP_SECURITY, validFrom, type EmailProvider, type EmailSettings, type SmtpSecurity } from "@/lib/email-settings";
import { isEmail } from "@/lib/report-recipients";

const PAGE = "/settings/server";

/** Maps failures to message keys under "server.errors". */
function failure(e: unknown): NonNullable<FormResult> {
  const code = e instanceof BackupError ? e.code : e instanceof Error && /^(updaterNotConfigured|updateInProgress|updaterError)$/.test(e.message) ? e.message : "failed";
  if (code === "failed") console.error("[server-admin]", e);
  return { error: `server.errors.${code}` };
}

export async function unlockAction(_: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("org.manage");
  const result = await unlockServerAdmin(ctx.user.id, String(form.get("password") ?? ""));
  if (result === "blocked") return { error: "server.errors.tooManyAttempts" };
  if (result !== "ok") return { error: "server.errors.wrongPassword" };
  revalidatePath(PAGE);
  return { ok: true };
}

export async function lockAction() {
  await requirePermission("org.manage");
  await lockServerAdmin();
  revalidatePath(PAGE);
}

export async function saveGeneralAction(_: FormResult, form: FormData): Promise<FormResult> {
  await requireServerAdmin();
  const parsed = parseForm(z.object({ appName: optStr(40) }), form);
  if (parsed.error) return parsed.error;
  await updateServerSettings({ appName: parsed.data.appName });
  revalidatePath("/", "layout");
  return { ok: true };
}

const scheduleSchema = z.object({
  hour: z.coerce.number().int().min(0).max(23),
  timezone: z.string().refine(validTimezone, "invalid"),
  hourlyKeep: z.coerce.number().int().min(1).max(500),
  dailyKeep: z.coerce.number().int().min(1).max(500),
  monthlyKeep: z.coerce.number().int().min(1).max(500),
});

export async function saveScheduleAction(_: FormResult, form: FormData): Promise<FormResult> {
  await requireServerAdmin();
  const parsed = parseForm(scheduleSchema, form);
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  const on = (k: string) => form.get(k) === "on";
  await updateServerSettings({
    backups: normalizeSchedule({
      hourly: { enabled: on("hourly"), keep: d.hourlyKeep },
      daily: { enabled: on("daily"), keep: d.dailyKeep },
      monthly: { enabled: on("monthly"), keep: d.monthlyKeep },
      hour: d.hour,
      timezone: d.timezone,
    }),
    autoUpdate: on("autoUpdate") && updaterConfigured(),
  });
  revalidatePath(PAGE);
  return { ok: true };
}

export async function backupNowAction(): Promise<FormResult> {
  await requireServerAdmin();
  try {
    await createBackup("manual");
  } catch (e) {
    return failure(e);
  }
  revalidatePath(PAGE);
  return { ok: true };
}

export async function deleteBackupAction(name: string) {
  await requireServerAdmin();
  await deleteBackup(name).catch(() => undefined);
  revalidatePath(PAGE);
}

export type RestoreResult = (NonNullable<FormResult> & { restarting?: boolean; overridden?: string[] }) | undefined;

export async function restoreBackupAction(name: string): Promise<RestoreResult> {
  const ctx = await requireServerAdmin();
  try {
    const { overridden } = await restoreBackup(name);
    console.warn(`[server-admin] restore of ${name} by ${ctx.user.email}`);
    return { ok: true, restarting: restartSoon(), overridden };
  } catch (e) {
    return failure(e);
  }
}

export async function checkUpdatesAction() {
  await requireServerAdmin();
  await checkForUpdate(true);
  revalidatePath(PAGE);
}

export async function updateNowAction(): Promise<FormResult> {
  const ctx = await requireServerAdmin();
  const status = await checkForUpdate(true);
  if (!status.available) return { error: "server.errors.noUpdate" };
  try {
    await updateNow();
  } catch (e) {
    return failure(e);
  }
  console.warn(`[server-admin] update to ${status.latest?.version} requested by ${ctx.user.email}`);
  return { ok: true };
}


// ── E-mail delivery

export type EmailResult = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; detail?: string; tested?: string } | undefined;

/**
 * Reads the e-mail form. Secret fields left blank keep the stored value, so the password/API key never has
 * to be sent back to the browser. Returns field errors (message keys) when the chosen provider is incomplete.
 */
function emailFromForm(form: FormData, current: EmailSettings): { settings: EmailSettings } | { fieldErrors: Record<string, string> } {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const provider = (EMAIL_PROVIDERS as readonly string[]).includes(get("provider")) ? (get("provider") as EmailProvider) : "env";
  const port = Number(get("smtpPort") || 587);
  const password = get("smtpPassword");
  const apiKey = get("resendKey");
  const settings: EmailSettings = {
    provider,
    from: get("from").slice(0, 300),
    smtp: {
      host: get("smtpHost").slice(0, 255),
      port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587,
      security: (SMTP_SECURITY as readonly string[]).includes(get("smtpSecurity")) ? (get("smtpSecurity") as SmtpSecurity) : "starttls",
      user: get("smtpUser").slice(0, 300),
      passwordEnc: form.get("smtpPasswordClear") === "on" ? null : password ? encryptField(password) : current.smtp.passwordEnc,
    },
    resend: { apiKeyEnc: apiKey ? encryptField(apiKey) : current.resend.apiKeyEnc },
  };
  const errors: Record<string, string> = {};
  if (provider !== "env" && !validFrom(settings.from)) errors.from = "badFrom";
  if (provider === "smtp" && !settings.smtp.host) errors.smtpHost = "too_small";
  if (provider === "smtp" && !(Number.isInteger(port) && port > 0 && port < 65536)) errors.smtpPort = "invalid";
  if (provider === "resend" && !settings.resend.apiKeyEnc) errors.resendKey = "too_small";
  return Object.keys(errors).length ? { fieldErrors: errors } : { settings };
}

/** Saves the e-mail settings, or (button "Send test e-mail") sends a test with what is in the form. */
export async function saveEmailAction(_: EmailResult, form: FormData): Promise<EmailResult> {
  const ctx = await requireServerAdmin();
  const current = (await getServerSettings()).email;
  const read = emailFromForm(form, current);
  if ("fieldErrors" in read) return { error: "validation", fieldErrors: read.fieldErrors };

  if (form.get("intent") === "test") {
    const to = String(form.get("testTo") ?? "").trim() || ctx.user.email;
    if (!isEmail(to)) return { error: "validation", fieldErrors: { testTo: "invalid_format" } };
    if (read.settings.provider === "env") return { error: "server.email.testNeedsProvider" };
    const t = await getTranslations("server.email");
    try {
      await sendTestEmail(read.settings, to, {
        subject: t("testSubject", { app: await getAppName() }),
        ...emailLayout({ org: await getAppName(), heading: t("testSubject", { app: await getAppName() }), paragraphs: [t("testBody")] }),
      });
    } catch (e) {
      // Shown to the server admin only: the provider's own message is what helps fix the settings.
      return { error: "server.email.testFailed", detail: e instanceof Error ? e.message.slice(0, 300) : String(e) };
    }
    return { ok: true, tested: to };
  }

  await updateServerSettings({ email: read.settings });
  revalidatePath(PAGE);
  return { ok: true };
}
