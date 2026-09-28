import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getContext } from "@/lib/context";
import { conversationTitle, openConversation, participantIds } from "@/lib/conversations";
import { Thread } from "./thread";

const PAGE = 200;

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  const conv = await openConversation(ctx, id);
  if (!conv) notFound();
  const t = await getTranslations();
  const format = await getFormatter();

  const [recent, people] = await Promise.all([
    ctx.db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: PAGE,
      include: { user: { select: { id: true, name: true } } },
    }),
    ctx.db.membership.findMany({
      where: { userId: { in: participantIds(conv) }, active: true },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const messages = recent.reverse();
  const today = new Date().toDateString();

  return (
    <Thread
      key={id}
      id={id}
      title={conversationTitle(conv, ctx.user.id)}
      subtitle={conv.type === "DIRECT" ? null : people.map((p) => p.user.name).join(", ")}
      canLeave={conv.type === "GROUP"}
      me={ctx.user.id}
      members={people.map((p) => p.user).filter((u) => u.id !== ctx.user.id)}
      truncated={recent.length === PAGE}
      messages={messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        body: m.body,
        at: m.createdAt.getTime(),
        time: format.dateTime(m.createdAt, m.createdAt.toDateString() === today ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" }),
      }))}
      labels={{ placeholder: t("messages.placeholder") }}
    />
  );
}
