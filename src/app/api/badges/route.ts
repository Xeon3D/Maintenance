import { getContext } from "@/lib/context";
import { unreadConversations } from "@/lib/conversations";

/** Unread counts for the bell and the Messages nav item (polled by the client). */
export async function GET() {
  const ctx = await getContext();
  const [notifications, messages] = await Promise.all([
    ctx.db.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
    ctx.can("internal.view") ? unreadConversations(ctx) : 0,
  ]);
  return Response.json({ notifications, messages }, { headers: { "Cache-Control": "private, no-store" } });
}
