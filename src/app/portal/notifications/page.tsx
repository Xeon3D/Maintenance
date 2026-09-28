import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { NotificationList } from "@/components/notifications/notification-list";
import { getContext } from "@/lib/context";

export default async function PortalNotificationsPage() {
  const ctx = await getContext();
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/portal" label={t("portal.title")} />
      <PageHeader title={t("notifications.title")} />
      <NotificationList ctx={ctx} />
    </>
  );
}
