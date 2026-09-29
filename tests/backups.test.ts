import { describe, expect, it } from "vitest";
import {
  backupFileName,
  backupsToPrune,
  DEFAULT_BACKUP_SCHEDULE,
  dueKinds,
  localHour,
  normalizeSchedule,
  parseBackupName,
  slotOf,
  type BackupSchedule,
} from "@/lib/backup-schedule";
import { compareVersions } from "@/lib/version";

const sched = (patch: Partial<BackupSchedule> = {}): BackupSchedule => ({ ...DEFAULT_BACKUP_SCHEDULE, ...patch });

describe("backup periods", () => {
  const s = sched({ hour: 3, timezone: "Europe/Lisbon" });

  it("daily and monthly periods start at the configured local hour", () => {
    // 01:30 UTC on 1 Oct = 02:30 Lisbon (summer time): still the previous day / month.
    expect(slotOf("daily", new Date("2026-10-01T01:30:00Z"), s)).toBe("2026-09-30");
    expect(slotOf("monthly", new Date("2026-10-01T01:30:00Z"), s)).toBe("2026-09");
    // 02:30 UTC = 03:30 Lisbon: the new day and month have started.
    expect(slotOf("daily", new Date("2026-10-01T02:30:00Z"), s)).toBe("2026-10-01");
    expect(slotOf("monthly", new Date("2026-10-01T02:30:00Z"), s)).toBe("2026-10");
  });

  it("hourly periods follow the local clock", () => {
    expect(slotOf("hourly", new Date("2026-10-01T09:59:00Z"), s)).toBe("2026-10-01T10");
    expect(localHour(new Date("2026-12-01T09:00:00Z"), "Europe/Lisbon")).toBe(9); // winter: UTC+0
  });

  it("a kind is due once per period, and only when enabled", () => {
    const now = new Date("2026-10-01T10:05:00Z");
    const all = sched({ hourly: { enabled: true, keep: 24 } });
    expect(dueKinds(all, {}, now)).toEqual(["hourly", "daily", "monthly"]);
    const state = { hourly: "2026-10-01T11", daily: "2026-10-01", monthly: "2026-10" };
    expect(dueKinds(all, state, now)).toEqual([]);
    expect(dueKinds(all, { ...state, hourly: "2026-10-01T10" }, new Date("2026-10-01T10:05:00Z"))).toEqual(["hourly"]);
    expect(dueKinds(sched({ daily: { enabled: false, keep: 7 } }), { monthly: "2026-10" }, now)).toEqual([]);
  });

  it("repairs invalid settings", () => {
    const n = normalizeSchedule({ hour: 99, timezone: "Mars/Olympus", daily: { enabled: false, keep: -3 } });
    expect(n.hour).toBe(23);
    expect(n.timezone).toBe(DEFAULT_BACKUP_SCHEDULE.timezone);
    expect(n.daily).toEqual({ enabled: false, keep: 1 });
    expect(normalizeSchedule(undefined)).toEqual(DEFAULT_BACKUP_SCHEDULE);
  });
});

describe("backup files", () => {
  it("round-trips names and rejects anything else", () => {
    const name = backupFileName("pre-update", new Date("2026-09-29T10:15:30.123Z"), "0.2.0");
    expect(name).toBe("maintenance-pre-update-20260929-101530Z-v0.2.0.tar.gz");
    expect(parseBackupName(name)).toMatchObject({ kind: "pre-update", version: "0.2.0", createdAt: new Date("2026-09-29T10:15:30Z") });
    expect(parseBackupName("../../etc/passwd")).toBeNull();
    expect(parseBackupName("maintenance-daily-20260929-101530Z-v0.2.0.tar.gz/../x")).toBeNull();
    expect(parseBackupName("maintenance-weekly-20260929-101530Z-v0.2.0.tar.gz")).toBeNull();
  });

  it("keeps the newest N per kind and never prunes manual or uploaded backups", () => {
    const at = (d: number) => new Date(Date.UTC(2026, 8, d, 3));
    const daily = [1, 2, 3, 4].map((d) => backupFileName("daily", at(d), "0.2.0"));
    const manual = [1, 2, 3, 4, 5, 6, 7].map((d) => backupFileName("manual", at(d), "0.2.0"));
    const safety = [1, 2, 3, 4, 5, 6, 7].map((d) => backupFileName("pre-restore", at(d), "0.2.0"));
    const prune = backupsToPrune([...daily, ...manual, ...safety, "notes.txt"], sched({ daily: { enabled: true, keep: 2 } }));
    expect(prune.sort()).toEqual([daily[0], daily[1], safety[0], safety[1]].sort());
  });
});

describe("versions", () => {
  it("compares release numbers", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareVersions("v0.2.0", "0.2.0")).toBe(0);
    expect(compareVersions("0.2.0", "0.2.1")).toBe(-1);
    expect(compareVersions("1.0.0-rc.1", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
  });
});
