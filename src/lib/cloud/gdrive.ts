import { check, readChunk, type CloudTarget } from "./target";

// Google Drive with an OAuth sign-in (a project created once in Google Cloud). The "drive.file" scope only
// reaches files and folders this app created, so the backup folder is created by the app in My Drive.
// Large files go up through a resumable upload in 8 MiB parts.

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const GDRIVE_SCOPES = "openid email https://www.googleapis.com/auth/drive.file";
const CHUNK = 32 * 262_144; // 8 MiB, a multiple of 256 KiB as Google requires
const FOLDER = "application/vnd.google-apps.folder";

export type GoogleApp = { clientId: string; clientSecret: string };

export function gdriveAuthorizeUrl(app: Pick<GoogleApp, "clientId">, redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GDRIVE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function token(app: GoogleApp, params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.clientId, client_secret: app.clientSecret, ...params }),
  });
  return (await (await check(res, "Google sign-in")).json()) as { access_token: string; refresh_token?: string };
}

/** Code from the sign-in redirect → refresh token + the account's e-mail. */
export async function gdriveConnect(app: GoogleApp, code: string, redirectUri: string) {
  const t = await token(app, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${t.access_token}` } });
  const me = (await (await check(res, "Google account")).json()) as { email?: string };
  return { refreshToken: t.refresh_token ?? "", account: me.email ?? null };
}

/** Escapes a value for a Drive search query (single-quoted strings). */
export const driveQuote = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/** `folderId` is a cached id for `folder` (created on first use); `onFolder` stores a newly found/created one. */
export function gdriveTarget(o: {
  app: GoogleApp;
  refreshToken: string;
  folder: string;
  folderId: string | null;
  onFolder: (id: string) => Promise<void>;
}): CloudTarget {
  let access: string | null = null;
  let folderId = o.folderId;

  async function auth() {
    access ??= (await token(o.app, { grant_type: "refresh_token", refresh_token: o.refreshToken })).access_token;
    return { Authorization: `Bearer ${access}` };
  }

  async function folder(create: boolean) {
    if (folderId) return folderId;
    let parent = "root";
    for (const part of o.folder.split("/").filter(Boolean)) {
      const search = new URLSearchParams({
        q: `name='${driveQuote(part)}' and mimeType='${FOLDER}' and '${parent}' in parents and trashed=false`,
        fields: "files(id)",
        pageSize: "1",
      });
      const found = (await (await check(await fetch(`${API}/files?${search}`, { headers: await auth() }), "Google Drive: folder")).json()) as { files: { id: string }[] };
      if (found.files[0]) parent = found.files[0].id;
      else if (!create) return null;
      else {
        const res = await fetch(`${API}/files?fields=id`, {
          method: "POST",
          headers: { ...(await auth()), "Content-Type": "application/json" },
          body: JSON.stringify({ name: part, mimeType: FOLDER, parents: [parent] }),
        });
        parent = ((await (await check(res, "Google Drive: creating folder")).json()) as { id: string }).id;
      }
    }
    folderId = parent;
    await o.onFolder(parent);
    return parent;
  }

  async function files() {
    const id = await folder(false);
    if (!id) return [];
    const search = new URLSearchParams({ q: `'${id}' in parents and trashed=false`, fields: "files(id,name)", pageSize: "1000" });
    const res = await fetch(`${API}/files?${search}`, { headers: await auth() });
    return ((await (await check(res, "Google Drive: listing")).json()) as { files: { id: string; name: string }[] }).files;
  }

  return {
    async upload(file, name, size) {
      const parent = await folder(true);
      for (const old of (await files()).filter((f) => f.name === name)) await fetch(`${API}/files/${old.id}`, { method: "DELETE", headers: await auth() });
      const start = await fetch(`${UPLOAD}?uploadType=resumable`, {
        method: "POST",
        headers: { ...(await auth()), "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(size), "X-Upload-Content-Type": "application/octet-stream" },
        body: JSON.stringify({ name, parents: [parent] }),
      });
      const location = (await check(start, "Google Drive: upload session")).headers.get("location");
      if (!location) throw new Error("Google Drive: no upload location");
      for (let offset = 0; offset < size; offset += CHUNK) {
        const chunk = await readChunk(file, offset, Math.min(CHUNK, size - offset));
        const part = await fetch(location, {
          method: "PUT",
          headers: { "Content-Length": String(chunk.length), "Content-Range": `bytes ${offset}-${offset + chunk.length - 1}/${size}` },
          body: new Uint8Array(chunk),
        });
        if (part.status !== 308) await check(part, "Google Drive: upload"); // 308 = send the next part
      }
    },
    async list() {
      return (await files()).map((f) => f.name);
    },
    async remove(name) {
      for (const f of (await files()).filter((x) => x.name === name)) {
        const res = await fetch(`${API}/files/${f.id}`, { method: "DELETE", headers: await auth() });
        if (res.status !== 404) await check(res, "Google Drive: delete");
      }
    },
  };
}
