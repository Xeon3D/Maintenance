import "server-only";
import type { AppContext } from "@/lib/context";

// Chat: direct messages, named groups and one channel per team. Work-order discussion stays in the
// WO's own comments (activity feed), so WORK_ORDER conversations aren't used.
//
// Access: DIRECT/GROUP through ConversationMember rows; TEAM through TeamMember (the channel's
// ConversationMember rows only carry read markers). Message and ConversationMember have no
// organizationId, so they're only reached through a Conversation loaded via ctx.db.

type Ctx = Pick<AppContext, "db" | "user" | "organization">;

export async function myTeamIds(ctx: Ctx) {
  const rows = await ctx.db.team.findMany({ where: { members: { some: { userId: ctx.user.id } } }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Filter for the conversations the current user may read and post in. */
export async function accessibleWhere(ctx: Ctx) {
  const teamIds = await myTeamIds(ctx);
  return {
    type: { not: "WORK_ORDER" as const },
    OR: [{ type: { in: ["DIRECT" as const, "GROUP" as const] }, members: { some: { userId: ctx.user.id } } }, { type: "TEAM" as const, teamId: { in: teamIds } }],
  };
}

/** Team channels are created on first use. */
export async function ensureTeamChannels(ctx: Ctx) {
  const teams = await ctx.db.team.findMany({ where: { members: { some: { userId: ctx.user.id } }, conversation: null }, select: { id: true } });
  for (const t of teams) {
    await ctx.db.conversation
      .create({ data: { organizationId: ctx.organization.id, type: "TEAM", teamId: t.id } })
      .catch(() => undefined); // created concurrently (teamId is unique)
  }
}

export async function listConversations(ctx: Ctx) {
  await ensureTeamChannels(ctx);
  const convs = await ctx.db.conversation.findMany({
    where: await accessibleWhere(ctx),
    include: {
      team: { select: { name: true, color: true } },
      members: { select: { userId: true, lastReadAt: true, user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true, user: { select: { name: true } } } },
    },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return convs.map((c) => ({ ...c, title: conversationTitle(c, ctx.user.id), unread: isUnread(c, ctx.user.id) }));
}

type TitleSource = { type: string; name: string | null; team: { name: string } | null; members: { userId: string; user: { name: string } }[] };

export function conversationTitle(c: TitleSource, me: string) {
  if (c.type === "TEAM") return c.team?.name ?? "—";
  if (c.name) return c.name;
  return (
    c.members
      .filter((m) => m.userId !== me)
      .map((m) => m.user.name)
      .join(", ") || "—"
  );
}

function isUnread(c: { lastMessageAt: Date | null; members: { userId: string; lastReadAt: Date | null }[] }, me: string) {
  if (!c.lastMessageAt) return false;
  const read = c.members.find((m) => m.userId === me)?.lastReadAt;
  return !read || c.lastMessageAt > read;
}

/** Number of conversations with messages the user hasn't seen (sidebar badge). */
export async function unreadConversations(ctx: Ctx) {
  const convs = await ctx.db.conversation.findMany({
    where: { ...(await accessibleWhere(ctx)), lastMessageAt: { not: null } },
    select: { lastMessageAt: true, members: { where: { userId: ctx.user.id }, select: { userId: true, lastReadAt: true } } },
  });
  return convs.filter((c) => isUnread(c, ctx.user.id)).length;
}

/** The conversation if the user may access it, with what the thread view needs. */
export async function openConversation(ctx: Ctx, id: string) {
  return ctx.db.conversation.findFirst({
    where: { id, ...(await accessibleWhere(ctx)) },
    include: {
      team: { select: { name: true, color: true, members: { select: { userId: true } } } },
      members: { select: { userId: true, lastReadAt: true, user: { select: { id: true, name: true } } } },
    },
  });
}

/** Everyone who should hear about a new message (team channels: current team members). */
export function participantIds(c: { type: string; team: { members: { userId: string }[] } | null; members: { userId: string }[] }) {
  return c.type === "TEAM" ? (c.team?.members ?? []).map((m) => m.userId) : c.members.map((m) => m.userId);
}
