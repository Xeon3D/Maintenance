import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { backupPath } from "@/lib/backups";
import { requireServerAdmin } from "@/lib/server-admin";
import { audit } from "@/lib/audit";

/** Downloads a backup archive (server admins only). */
export async function GET(_: Request, { params }: RouteContext<"/api/server/backups/[name]">) {
  let ctx: Awaited<ReturnType<typeof requireServerAdmin>>;
  try {
    ctx = await requireServerAdmin();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { name } = await params;
  const file = await backupPath(name).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  // A backup holds every company's data and the encryption keys: each download is logged.
  await audit(ctx, "server.backupDownload", "Server", "-", { name });
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
