import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { APP_VERSION, compareVersions } from "@/lib/version";
import { dataDir } from "@/lib/server-settings";

// Update check against the version tags of the app image on Docker Hub (public, unlike the GitHub
// repository), and the trigger for the Watchtower sidecar ("updater" in docker-compose.yml) that
// pulls the new image and recreates only the app container.

const IMAGE = () => process.env.APP_IMAGE || "xeon3d/maintenance";
const CHECK_TTL = 6 * 3_600_000;
/** Index annotation that release.yml puts on each image: base64 of a JSON array of release-note lines. */
export const NOTES_ANNOTATION = "io.villaops.release-notes"; // pre-Domusly name, read by installed servers: keep
/** Notes are read for at most this many newer versions (each read is a registry pull request). */
const MAX_NOTES = 5;

export type ReleaseInfo = { version: string; url: string; notes: string[]; publishedAt: string | null };
export type UpdateStatus = {
  current: string;
  latest: ReleaseInfo | null;
  available: boolean;
  /** Releases newer than the installed version, newest first (what an update would bring). */
  changelog: ReleaseInfo[];
  checkedAt: Date | null;
  error: string | null;
};

type HubTag = { name: string; tag_last_pushed?: string | null; last_updated?: string | null };

let cache: { at: number; releases: ReleaseInfo[]; error: string | null } | null = null;
/** Notes never change for a published version, so they are read once per process. */
const notesCache = new Map<string, string[]>();

/** "docker.io/xeon3d/maintenance:latest" → "xeon3d/maintenance" (official images live in "library/"). */
export function hubRepository(image: string) {
  const name = image.replace(/^(?:docker\.io|index\.docker\.io|registry-1\.docker\.io)\//, "").replace(/[:@].*$/, "");
  return name.includes("/") ? name : `library/${name}`;
}

/** The release versions among the image's tags ("0.4.12", not "latest"), newest first. */
export function releasesFromTags(repo: string, tags: HubTag[]): ReleaseInfo[] {
  return tags
    .filter((t) => /^\d+\.\d+\.\d+$/.test(t.name))
    .map((t) => ({
      version: t.name,
      url: `https://hub.docker.com/r/${repo}/tags?name=${t.name}`,
      notes: [],
      publishedAt: t.tag_last_pushed ?? t.last_updated ?? null,
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** Decodes the release-notes annotation; anything malformed reads as no notes. */
export function decodeNotes(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const lines: unknown = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === "string" && l.trim() !== "").map((l) => l.trim()) : [];
  } catch {
    return [];
  }
}

const hubFetch = (url: string, headers: Record<string, string> = {}) =>
  fetch(url, {
    headers: { "User-Agent": `maintenance/${APP_VERSION}`, ...headers },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

async function readNotes(repo: string, version: string, token: string) {
  const res = await hubFetch(`https://registry-1.docker.io/v2/${repo}/manifests/${version}`, {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json",
  });
  if (!res.ok) throw new Error(`Docker Hub answered ${res.status}`);
  const manifest = (await res.json()) as { annotations?: Record<string, string> };
  return decodeNotes(manifest.annotations?.[NOTES_ANNOTATION]);
}

/** Fills in the notes of the newer releases (best effort: a version whose notes can't be read shows none). */
async function addNotes(repo: string, releases: ReleaseInfo[]) {
  const wanted = releases.filter((r) => compareVersions(r.version, APP_VERSION) > 0).slice(0, MAX_NOTES);
  const missing = wanted.filter((r) => !notesCache.has(r.version));
  if (missing.length) {
    try {
      const auth = await hubFetch(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`);
      if (!auth.ok) throw new Error(`Docker Hub answered ${auth.status}`);
      const { token } = (await auth.json()) as { token: string };
      for (const r of missing) notesCache.set(r.version, await readNotes(repo, r.version, token).catch(() => []));
    } catch (e) {
      console.warn("[update] couldn't read release notes", e);
    }
  }
  for (const r of wanted) r.notes = notesCache.get(r.version) ?? [];
}

export async function checkForUpdate(force = false): Promise<UpdateStatus> {
  if (force || !cache || Date.now() - cache.at > CHECK_TTL) {
    try {
      const repo = hubRepository(IMAGE());
      const [namespace, name] = repo.split("/");
      const res = await hubFetch(`https://hub.docker.com/v2/namespaces/${namespace}/repositories/${name}/tags?page_size=100`);
      if (!res.ok) throw new Error(`Docker Hub answered ${res.status}`);
      const releases = releasesFromTags(repo, ((await res.json()) as { results: HubTag[] }).results ?? []);
      await addNotes(repo, releases);
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
