import { getFormatter, getTranslations } from "next-intl/server";
import { Bell, CheckCheck } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import type { AppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { markAllReadAction } from "./actions";

const LIMIT = 100;

/** The signed-in user's notifications (staff app and client portal). */
export async function NotificationList({ ctx }: { ctx: AppContext }) {
  const t = await getTranslations();
  const format = await getFormatter();
  const items = await ctx.db.notification.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: "desc" }, take: LIMIT });
  const unread = items.filter((n) => !n.readAt).length;
  const now = new Date();

  // Rendered in the reader's current language from type + data; the stored text is the fallback.
  const text = (n: (typeof items)[number], part: "title" | "body") => {
    const key = `notify.${n.type}.${part}` as never;
    const data = n.data && typeof n.data === "object" ? (n.data as Record<string, string | number>) : null;
    if (data && t.has(key)) return t(key, data as never).trim() || null;
    return part === "title" ? n.title : n.body;
  };

  if (items.length === 0) return <EmptyState title={t("notifications.empty")} description={t("notifications.emptyHint")} />;

  return (
    <>
      {unread > 0 && (
        <form action={markAllReadAction} className="mb-3 flex justify-end">
          <Button variant="secondary" size="sm">
            <CheckCheck className="size-4" />
            {t("notifications.markAllRead")}
          </Button>
        </form>
      )}
      <Card>
        <ul className="divide-y divide-border">
          {items.map((n) => (
            <li key={n.id}>
              <a href={`/api/notifications/${n.id}`} className={cn("flex gap-3 px-4 py-3 hover:bg-gray-50", !n.readAt && "bg-brand/5")}>
                <Bell className={cn("mt-0.5 size-4 shrink-0", n.readAt ? "text-muted" : "text-brand")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-medium")}>{text(n, "title")}</span>
                  {text(n, "body") && <span className="block truncate text-sm text-muted">{text(n, "body")}</span>}
                  <span className="block text-xs text-muted">{format.relativeTime(n.createdAt, now)}</span>
                </span>
                {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label={t("messages.unread")} />}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
