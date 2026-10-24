import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_BACKUP_SCHEDULE, normalizeSchedule, type BackupSchedule } from "@/lib/backup-schedule";
import { DEFAULT_EMAIL, normalizeEmailSettings, type EmailSettings } from "@/lib/email-settings";
import { DEFAULT_BACKUP_COPIES, normalizeBackupCopies, type BackupCopies } from "@/lib/backup-copies-settings";

// Server-wide settings (not per company): software name and version label, public sign-up, backup schedule, automatic updates, e-mail delivery.
// Kept in a JSON file in DATA_DIR so they survive a factory reset and a database restore.

export const DEFAULT_APP_NAME = "Domusly";

export type ServerSettings = {
  appName: string | null;
  /** Show the version (on a dev server, the commit) after the software name in the sidebar. */
  showVersion: boolean;
  /** Anyone can create an account and a new company from the sign-in page (see lib/signup.ts). */
  allowSignup: boolean;
  backups: BackupSchedule;
  autoUpdate: boolean;
  email: EmailSettings;
  backupCopies: BackupCopies;
};

const DEFAULTS: ServerSettings = { appName: null, showVersion: false, allowSignup: true, backups: DEFAULT_BACKUP_SCHEDULE, autoUpdate: false, email: DEFAULT_EMAIL, backupCopies: DEFAULT_BACKUP_COPIES };

export const dataDir = () => path.resolve(process.env.DATA_DIR ?? "./.data");
const file = () => path.join(dataDir(), "server-settings.json");

let cached: { mtime: number; value: ServerSettings } | null = null;

export async function getServerSettings(): Promise<ServerSettings> {
  try {
    const { mtimeMs } = await stat(file());
    if (cached?.mtime === mtimeMs) return cached.value;
    const raw = JSON.parse(await readFile(file(), "utf8")) as Partial<ServerSettings>;
    const value: ServerSettings = {
      appName: typeof raw.appName === "string" && raw.appName.trim() ? raw.appName.trim().slice(0, 40) : null,
      showVersion: raw.showVersion === true,
      allowSignup: raw.allowSignup !== false,
      backups: normalizeSchedule(raw.backups),
      autoUpdate: raw.autoUpdate === true,
      email: normalizeEmailSettings(raw.email),
      backupCopies: normalizeBackupCopies(raw.backupCopies),
    };
    cached = { mtime: mtimeMs, value };
    return value;
  } catch {
    return DEFAULTS;
  }
}

export async function updateServerSettings(patch: Partial<ServerSettings>) {
  const next = { ...(await getServerSettings()), ...patch };
  await mkdir(dataDir(), { recursive: true });
  const tmp = `${file()}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2));
  await rename(tmp, file()); // atomic replace
  cached = null;
  return next;
}

/** The software's display name: set in Server settings, else APP_NAME, else the default. */
export async function getAppName() {
  return (await getServerSettings()).appName || process.env.APP_NAME?.trim() || DEFAULT_APP_NAME;
}
