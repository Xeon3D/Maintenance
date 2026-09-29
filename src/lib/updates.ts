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

export type ReleaseInfo = { version: string; url: string; html: string; publishedAt: string | null };
export type UpdateStatus = {
  current: string;
  latest: ReleaseInfo | null;
  available: boolean;
  /** Releases newer than the installed version, newest first (what an update would bring). */
  changelog: ReleaseInfo[];
  checkedAt: Date | null;
  error: string | null;
};

type GhRelease = { tag_name: string; html_url: string; body_html?: string; published_at?: string; draft: boolean; prerelease: boolean };

let cache: { at: number; releases: ReleaseInfo[]; error: string | null } | null = null;

/**
 * GitHub renders and sanitizes release notes (body_html). As a second line of defence anything
 * active is stripped here too, and links open in a new tab.
 */
export function cleanReleaseHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\b(href|src)\s*=\s*(["'])\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"')
    .replace(/<a\s/gi, '<a target="_blank" rel="noreferrer noopener" ');
}

export async function checkForUpdate(force = false): Promise<UpdateStatus> {
  if (force || !cache || Date.now() - cache.at > CHECK_TTL) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO()}/releases?per_page=30`, {
        headers: { Accept: "application/vnd.github.html+json", "User-Agent": `maintenance/${APP_VERSION}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const releases = ((await res.json()) as GhRelease[])
        .filter((r) => !r.draft && !r.prerelease)
        .map((r) => ({ version: r.tag_name.replace(/^v/i, ""), url: r.html_url, html: cleanReleaseHtml(r.body_html ?? ""), publishedAt: r.published_at ?? null }))
        .sort((a, b) => compareVersions(b.version, a.version));
      cache = { at: Date.now(), releases, error: null };
    } catch (e) {
      cache = { at: Date.now(), releases: cache?.releases ?? [], error: e instanceof Error ? e.message : String(e) };
    }
  }
  const changelog = cache.releases.filter((r) => compareVersions(r.version, APP_VERSION) > 0);
  return { current: APP_VERSION, latest: cache.releases[0] ?? null, available: changelog.length > 0, changelog, checkedAt: new Date(cache.at), error: cache.error };
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
