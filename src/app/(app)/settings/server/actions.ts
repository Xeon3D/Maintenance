"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { optStr, parseForm, type FormResult } from "@/lib/forms";
import { lockServerAdmin, requireServerAdmin, unlockServerAdmin } from "@/lib/server-admin";
import { updateServerSettings } from "@/lib/server-settings";
import { normalizeSchedule, validTimezone } from "@/lib/backup-schedule";
import { BackupError, createBackup, deleteBackup, restartSoon, restoreBackup, updateNow } from "@/lib/backups";
import { checkForUpdate, updaterConfigured } from "@/lib/updates";

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

