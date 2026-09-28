"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Hash, Plus, User, Users } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export type ConversationItem = {
  id: string;
  title: string;
  type: string;
  color: string | null;
  unread: boolean;
  preview: string | null;
  when: string | null;
};

const ICON = { TEAM: Hash, GROUP: Users, DIRECT: User } as Record<string, typeof Hash>;

/** Conversation sidebar. On small screens it's hidden while a conversation is open. */
export function ConversationList({ items }: { items: ConversationItem[] }) {
  const t = useTranslations("messages");
  const pathname = usePathname();
  const inThread = pathname !== "/messages";

  return (
    <Card className={cn("h-fit overflow-hidden", inThread && "hidden lg:block")}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{t("conversations")}</h2>
        <Link href="/messages/new">
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            {t("new")}
          </Button>
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
          {items.map((c) => {
            const Icon = ICON[c.type] ?? User;
            const active = pathname === `/messages/${c.id}`;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className={cn("flex gap-3 px-4 py-3 hover:bg-gray-50", active && "bg-brand/5")}>
                  <span className="mt-0.5 shrink-0 rounded-md bg-gray-100 p-1.5 text-muted" style={c.color ? { color: c.color } : undefined}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.title}</span>
                      {c.when && <span className="shrink-0 text-xs text-muted">{c.when}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-xs", c.unread ? "text-foreground" : "text-muted")}>{c.preview ?? t("noMessagesYet")}</span>
                      {c.unread && <span className="ml-auto size-2 shrink-0 rounded-full bg-brand" aria-label={t("unread")} />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
