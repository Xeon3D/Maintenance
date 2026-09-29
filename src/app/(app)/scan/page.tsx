import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { ScanLauncher } from "./scan-launcher";

export const metadata = { title: "Scan" };

export default async function ScanPage() {
  const t = await getTranslations("scan");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ScanLauncher />
    </>
  );
}
