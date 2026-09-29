import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_BACKUP_SCHEDULE, normalizeSchedule, type BackupSchedule } from "@/lib/backup-schedule";

// Server-wide settings (not per company): software name, backup schedule, automatic updates.
// Kept in a JSON file in DATA_DIR so they survive a factory reset and a database restore.

export const DEFAULT_APP_NAME = "VillaOps";

export type ServerSettings = {
  appName: string | null;
  backups: BackupSchedule;
  autoUpdate: boolean;
};

const DEFAULTS: ServerSettings = { appName: null, backups: DEFAULT_BACKUP_SCHEDULE, autoUpdate: false };

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
      backups: normalizeSchedule(raw.backups),
      autoUpdate: raw.autoUpdate === true,
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
