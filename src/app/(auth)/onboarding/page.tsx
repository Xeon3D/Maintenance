import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/context";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  await requireUser();
  const t = await getTranslations("onboarding");
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("description")}</p>
      <OnboardingForm />
    </Card>
  );
}
