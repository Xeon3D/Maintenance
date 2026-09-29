import { getContext } from "@/lib/context";

// Relative Location: behind a reverse proxy req.url is the internal address (e.g. http://0.0.0.0:3000),
// so an absolute redirect built from it would send the browser there.
const goTo = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });

/** Marks one of my notifications read, then goes to what it's about. */
export async function GET(_: Request, { params }: RouteContext<"/api/notifications/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const n = await ctx.db.notification.findFirst({ where: { id, userId: ctx.user.id } });
  const home = ctx.role === "REQUESTER" ? "/portal/notifications" : "/notifications";
  if (!n) return goTo(home);
  if (!n.readAt) await ctx.db.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  // Only ever redirect within the app.
  const to = n.link && /^\/(?![/\\])/.test(n.link) ? n.link : home;
  return goTo(to);
}
