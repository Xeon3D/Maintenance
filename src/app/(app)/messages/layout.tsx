import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { getContext } from "@/lib/context";
import { listConversations } from "@/lib/conversations";
import { excerpt } from "@/lib/mentions";
import { ConversationList } from "./conversation-list";

export const metadata = { title: "Messages" };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const convs = await listConversations(ctx);
  const now = new Date();

  return (
    <>
      <PageHeader title={t("nav.messages")} description={t("messages.description")} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <ConversationList
          items={convs.map((c) => {
            const last = c.messages[0];
            const sameDay = last && last.createdAt.toDateString() === now.toDateString();
            return {
              id: c.id,
              title: c.title,
              type: c.type,
              color: c.team?.color ?? null,
              unread: c.unread,
              preview: last ? `${last.user.name.split(" ")[0]}: ${excerpt(last.body, 60)}` : null,
              when: last ? format.dateTime(last.createdAt, sameDay ? { timeStyle: "short" } : { dateStyle: "short" }) : null,
            };
          })}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
