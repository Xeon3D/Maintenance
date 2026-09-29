// Pure backup scheduling rules (no I/O), shared by the backup runner, the settings page and tests.

export const SCHEDULED_KINDS = ["hourly", "daily", "monthly"] as const;
export const BACKUP_KINDS = [...SCHEDULED_KINDS, "manual", "pre-update", "pre-restore", "uploaded"] as const;
export type ScheduledKind = (typeof SCHEDULED_KINDS)[number];
export type BackupKind = (typeof BACKUP_KINDS)[number];

export type BackupSchedule = {
  hourly: { enabled: boolean; keep: number };
  daily: { enabled: boolean; keep: number };
  monthly: { enabled: boolean; keep: number };
  /** Local hour (0–23) at which daily and monthly backups (and automatic updates) run. */
  hour: number;
  timezone: string;
};

export const DEFAULT_BACKUP_SCHEDULE: BackupSchedule = {
  hourly: { enabled: false, keep: 24 },
  daily: { enabled: true, keep: 7 },
  monthly: { enabled: true, keep: 12 },
  hour: 3,
  timezone: "Europe/Lisbon",
};

/** Automatic safety copies (before updates / restores) kept per kind; manual and uploaded ones are never pruned. */
export const SAFETY_KEEP = 5;
export const MAX_KEEP = 500;

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeSchedule(raw: unknown): BackupSchedule {
  const r = (raw ?? {}) as Partial<Record<keyof BackupSchedule, unknown>>;
  const d = DEFAULT_BACKUP_SCHEDULE;
  const kind = (k: ScheduledKind) => {
    const v = (r[k] ?? {}) as { enabled?: unknown; keep?: unknown };
    return { enabled: typeof v.enabled === "boolean" ? v.enabled : d[k].enabled, keep: clampInt(v.keep, 1, MAX_KEEP, d[k].keep) };
  };
  return {
    hourly: kind("hourly"),
    daily: kind("daily"),
    monthly: kind("monthly"),
    hour: clampInt(r.hour, 0, 23, d.hour),
    timezone: validTimezone(r.timezone) ? r.timezone : d.timezone,
  };
}

function localParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

export function localHour(at: Date, timeZone: string) {
  return Number(localParts(at, timeZone).h);
}

/**
 * The period a scheduled backup belongs to. Daily and monthly periods start at `hour` local time,
 * so shifting the clock back by that many hours gives the right calendar day/month.
 */
export function slotOf(kind: ScheduledKind, now: Date, s: Pick<BackupSchedule, "hour" | "timezone">) {
  if (kind === "hourly") {
    const p = localParts(now, s.timezone);
    return `${p.y}-${p.m}-${p.d}T${p.h}`;
  }
  const p = localParts(new Date(now.getTime() - s.hour * 3_600_000), s.timezone);
  return kind === "daily" ? `${p.y}-${p.m}-${p.d}` : `${p.y}-${p.m}`;
}

export type ScheduleState = Partial<Record<ScheduledKind | "autoUpdate", string>>;

/** Scheduled kinds whose current period has no backup yet. */
export function dueKinds(s: BackupSchedule, state: ScheduleState, now: Date): ScheduledKind[] {
  return SCHEDULED_KINDS.filter((k) => s[k].enabled && state[k] !== slotOf(k, now, s));
}

// ── File names: maintenance-<kind>-<yyyymmdd-hhmmss>Z-v<version>.tar.gz (UTC)

const NAME_RE = new RegExp(`^maintenance-(${BACKUP_KINDS.join("|")})-(\\d{8}-\\d{6})Z-v([0-9A-Za-z.+-]{1,32})\\.tar\\.gz$`);

export function backupFileName(kind: BackupKind, at: Date, version: string) {
  const iso = at.toISOString(); // 2026-09-29T10:15:30.123Z
  const stamp = `${iso.slice(0, 10).replaceAll("-", "")}-${iso.slice(11, 19).replaceAll(":", "")}`;
  return `maintenance-${kind}-${stamp}Z-v${version.replace(/[^0-9A-Za-z.+-]/g, "")}.tar.gz`;
}

export function parseBackupName(name: string) {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const s = m[2];
  const createdAt = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`);
  return { name, kind: m[1] as BackupKind, createdAt, version: m[3] };
}

/** Names to delete so each kind keeps only its newest N (manual and uploaded backups are kept). */
export function backupsToPrune(names: string[], s: BackupSchedule) {
  const parsed = names.map(parseBackupName).filter((b) => b !== null);
  const keepOf = (k: BackupKind) =>
    k === "hourly" || k === "daily" || k === "monthly" ? s[k].keep : k === "pre-update" || k === "pre-restore" ? SAFETY_KEEP : Infinity;
  const out: string[] = [];
  for (const kind of BACKUP_KINDS) {
    const list = parsed.filter((b) => b.kind === kind).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    out.push(...list.slice(keepOf(kind)).map((b) => b.name));
  }
  return out;
}
