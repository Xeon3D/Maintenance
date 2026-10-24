import { getContext, type AppContext } from "@/lib/context";
import { objectSize, objectStream, posterRef } from "@/lib/storage";
import { isVideo, parseRange } from "@/lib/video-rules";
import { portalScopes } from "@/lib/portal-scope";

// Files are immutable, so the attachment id doubles as ETag. `no-cache` makes the browser revalidate
// on every view (auth is re-checked; unchanged files get a cheap 304), so nothing stays viewable after sign-out.
const CACHE = "private, no-cache";

/** Client-portal users may only see files on their villas' requests and client-visible work orders. */
async function portalCanSee(ctx: AppContext, att: { requestId: string | null; workOrderId: string | null }) {
  const clientId = ctx.membership.clientId;
  if (ctx.role !== "REQUESTER" || !clientId) return false;
  // Same reach as the portal: villas the client owns or manages for another owner (lib/portal-scope.ts).
  const scope = portalScopes(clientId, ctx.user.id);
  if (att.workOrderId && (await ctx.db.workOrder.count({ where: { id: att.workOrderId, ...scope.workOrderWhere } }))) return true;
  if (att.requestId && (await ctx.db.request.count({ where: { id: att.requestId, ...scope.requestWhere } }))) return true;
  return false;
}

export async function GET(req: Request, { params }: RouteContext<"/api/files/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const att = await ctx.db.attachment.findUnique({ where: { id } });
  if (!att) return new Response("Not found", { status: 404 });
  if (!ctx.can("internal.view") && !(await portalCanSee(ctx, att))) return new Response("Not found", { status: 404 });

  // `?poster=1`: a video's thumbnail (stored next to it).
  const poster = new URL(req.url).searchParams.has("poster") && isVideo(att.mimeType);
  const ref = poster ? posterRef(att.url) : att.url;
  const etag = poster ? `"${att.id}-poster"` : `"${att.id}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE } });
  }

  const size = await objectSize(ref).catch(() => null);
  if (size === null) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": poster ? "image/jpeg" : att.mimeType,
    "Content-Disposition": `inline; filename="${encodeURIComponent(poster ? "poster.jpg" : att.filename)}"`,
    "Cache-Control": CACHE,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  // Byte ranges: Safari won't play a video without them, and they let players seek.
  const range = req.headers.get("if-range") && req.headers.get("if-range") !== etag ? null : parseRange(req.headers.get("range"), size);
  if (range === "invalid") return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  if (range) {
    return new Response(objectStream(ref, range), {
      status: 206,
      headers: { ...headers, "Content-Length": String(range.end - range.start + 1), "Content-Range": `bytes ${range.start}-${range.end}/${size}` },
    });
  }
  return new Response(objectStream(ref), { headers: { ...headers, "Content-Length": String(size) } });
}
