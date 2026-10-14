import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { NotificationList } from "@/components/notifications/notification-list";
import { getContext } from "@/lib/context";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("notifications.title");

export default async function NotificationsPage() {
  const ctx = await getContext();
  const t = await getTranslations("notifications");
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("title")} description={t("description")} />
      <NotificationList ctx={ctx} />
    </div>
  );
}
