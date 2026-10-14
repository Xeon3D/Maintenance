import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { check, encodePath, type CloudTarget } from "./target";

// WebDAV (Nextcloud, ownCloud, most NAS, Koofr…): plain HTTP with Basic authentication.

export function webdavTarget(o: { url: string; user: string; password: string | null; folder: string }): CloudTarget {
  const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
    ...(o.user ? { Authorization: `Basic ${Buffer.from(`${o.user}:${o.password ?? ""}`).toString("base64")}` } : {}),
    ...extra,
  });
  const folderUrl = `${o.url}/${encodePath(o.folder)}`;
  const fileUrl = (name: string) => `${folderUrl}/${encodeURIComponent(name)}`;

  async function ensureFolder() {
    let url = o.url;
    for (const part of o.folder.split("/").filter(Boolean)) {
      url += `/${encodeURIComponent(part)}`;
      const res = await fetch(url, { method: "MKCOL", headers: headers() });
      // 201 created; 405 (or 301 from some servers) = it already exists.
      if (!res.ok && res.status !== 405 && res.status !== 301) await check(res, "WebDAV: creating folder");
    }
  }

  return {
    async upload(file, name, size) {
      await ensureFolder();
      const res = await fetch(fileUrl(name), {
        method: "PUT",
        headers: headers({ "Content-Type": "application/octet-stream", "Content-Length": String(size) }),
        body: Readable.toWeb(createReadStream(file)) as ReadableStream,
        duplex: "half",
      } as RequestInit);
      await check(res, "WebDAV: upload");
    },
    async list() {
      const res = await fetch(`${folderUrl}/`, { method: "PROPFIND", headers: headers({ Depth: "1", "Content-Type": "application/xml" }) });
      if (res.status === 404) return [];
      const xml = await (await check(res, "WebDAV: listing")).text();
      const own = o.folder.split("/").filter(Boolean).pop();
      return [...xml.matchAll(/<(?:[\w-]+:)?href>([^<]+)<\/(?:[\w-]+:)?href>/gi)]
        .map((m) => decodeURIComponent(m[1].replace(/\/$/, "").split("/").pop() ?? ""))
        .filter((n) => n && n !== own);
    },
    async remove(name) {
      const res = await fetch(fileUrl(name), { method: "DELETE", headers: headers() });
      if (res.status === 404) return;
      await check(res, "WebDAV: delete");
    },
  };
}
