import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";

/** Marks one of my notifications read, then goes to what it's about. */
export async function GET(req: Request, { params }: RouteContext<"/api/notifications/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const n = await ctx.db.notification.findFirst({ where: { id, userId: ctx.user.id } });
  const home = ctx.role === "REQUESTER" ? "/portal/notifications" : "/notifications";
  if (!n) return NextResponse.redirect(new URL(home, req.url));
  if (!n.readAt) await ctx.db.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  // Only ever redirect within the app.
  const to = n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : home;
  return NextResponse.redirect(new URL(to, req.url));
}
