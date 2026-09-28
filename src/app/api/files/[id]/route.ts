import { getContext, type AppContext } from "@/lib/context";
import { getObject } from "@/lib/storage";

// Files are immutable, so the attachment id doubles as ETag. `no-cache` makes the browser revalidate
// on every view (auth is re-checked; unchanged files get a cheap 304), so nothing stays viewable after sign-out.
const CACHE = "private, no-cache";

/** Client-portal users may only see files on their villas' requests and client-visible work orders. */
async function portalCanSee(ctx: AppContext, att: { requestId: string | null; workOrderId: string | null }) {
  const clientId = ctx.membership.clientId;
  if (ctx.role !== "REQUESTER" || !clientId) return false;
  if (att.workOrderId && (await ctx.db.workOrder.count({ where: { id: att.workOrderId, clientVisible: true, villa: { clientId } } }))) return true;
  if (att.requestId) {
    const n = await ctx.db.request.count({ where: { id: att.requestId, OR: [{ villa: { clientId } }, { requesterId: ctx.user.id }] } });
    if (n) return true;
  }
  return false;
}

export async function GET(req: Request, { params }: RouteContext<"/api/files/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const att = await ctx.db.attachment.findUnique({ where: { id } });
  if (!att) return new Response("Not found", { status: 404 });
  if (!ctx.can("internal.view") && !(await portalCanSee(ctx, att))) return new Response("Not found", { status: 404 });

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
