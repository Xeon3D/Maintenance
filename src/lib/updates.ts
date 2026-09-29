import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { APP_VERSION, compareVersions } from "@/lib/version";
import { dataDir } from "@/lib/server-settings";

// Update check against the project's GitHub releases, and the trigger for the Watchtower sidecar
// ("updater" in docker-compose.yml) that pulls the new image and recreates only the app container.

const REPO = () => process.env.UPDATE_REPO || "Xeon3D/Maintenance";
const IMAGE = () => process.env.APP_IMAGE || "xeon3d/maintenance";
const CHECK_TTL = 6 * 3_600_000;

export type ReleaseInfo = { version: string; url: string; notes: string; publishedAt: string | null };
export type UpdateStatus = { current: string; latest: ReleaseInfo | null; available: boolean; checkedAt: Date | null; error: string | null };

let cache: { at: number; latest: ReleaseInfo | null; error: string | null } | null = null;

export async function checkForUpdate(force = false): Promise<UpdateStatus> {
  if (force || !cache || Date.now() - cache.at > CHECK_TTL) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO()}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": `maintenance/${APP_VERSION}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const r = (await res.json()) as { tag_name: string; html_url: string; body?: string; published_at?: string };
      cache = { at: Date.now(), latest: { version: r.tag_name.replace(/^v/i, ""), url: r.html_url, notes: r.body ?? "", publishedAt: r.published_at ?? null }, error: null };
    } catch (e) {
      cache = { at: Date.now(), latest: cache?.latest ?? null, error: e instanceof Error ? e.message : String(e) };
    }
  }
  const latest = cache.latest;
  return { current: APP_VERSION, latest, available: !!latest && compareVersions(latest.version, APP_VERSION) > 0, checkedAt: new Date(cache.at), error: cache.error };
}

/** The Watchtower API token: UPDATER_TOKEN, else the file the entrypoint generates in DATA_DIR. */
async function updaterToken() {
  if (process.env.UPDATER_TOKEN) return process.env.UPDATER_TOKEN;
  try {
    return (await readFile(path.join(dataDir(), "updater-token"), "utf8")).trim() || null;
  } catch {
    return null;
  }
}

export function updaterConfigured() {
  return !!process.env.UPDATER_URL;
}

/** Asks Watchtower to pull the newest image and recreate this container (it returns at once; we restart shortly after). */
export async function triggerUpdate() {
  const url = process.env.UPDATER_URL;
  const token = await updaterToken();
  if (!url || !token) throw new Error("updaterNotConfigured");
  const res = await fetch(`${url.replace(/\/$/, "")}/v1/update?image=${encodeURIComponent(IMAGE())}&async=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) throw new Error("updateInProgress");
  if (!res.ok) throw new Error(`updaterError`);
}
