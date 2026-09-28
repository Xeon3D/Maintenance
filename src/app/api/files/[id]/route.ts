import { getContext } from "@/lib/context";
import { getObject } from "@/lib/storage";

// Serves an attachment to members of its organization only.
// Files are immutable, so the attachment id doubles as ETag. `no-cache` makes the browser revalidate
// on every view (auth is re-checked; unchanged files get a cheap 304), so nothing stays viewable after sign-out.
const CACHE = "private, no-cache";

export async function GET(req: Request, { params }: RouteContext<"/api/files/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return new Response("Not found", { status: 404 });
  const att = await ctx.db.attachment.findUnique({ where: { id } });
  if (!att) return new Response("Not found", { status: 404 });

  const etag = `"${att.id}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE } });
  }

  const data = await getObject(att.url).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${encodeURIComponent(att.filename)}"`,
      "Cache-Control": CACHE,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
