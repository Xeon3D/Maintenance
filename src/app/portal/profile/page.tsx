import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { ProfileSettings } from "@/app/account/profile-settings";

export default async function PortalProfilePage() {
  const t = await getTranslations();
  return (
    <>
      <BackLink href="/portal" label={t("portal.title")} />
      <PageHeader title={t("profile.title")} />
      <ProfileSettings portal />
    </>
  );
}
