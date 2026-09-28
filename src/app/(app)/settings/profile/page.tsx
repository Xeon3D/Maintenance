import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { ProfileSettings } from "@/app/account/profile-settings";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ProfileSettings />
    </>
  );
}
