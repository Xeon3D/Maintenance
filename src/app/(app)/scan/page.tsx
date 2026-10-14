import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { ScanLauncher } from "./scan-launcher";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("nav.scan");

export default async function ScanPage() {
  const t = await getTranslations("scan");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ScanLauncher />
    </>
  );
}
