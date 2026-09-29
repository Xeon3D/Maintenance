import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { backupPath } from "@/lib/backups";
import { requireServerAdmin } from "@/lib/server-admin";

/** Downloads a backup archive (server admins only). */
export async function GET(_: Request, { params }: RouteContext<"/api/server/backups/[name]">) {
  try {
    await requireServerAdmin();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { name } = await params;
  const file = await backupPath(name).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  const { size } = await stat(file);
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
