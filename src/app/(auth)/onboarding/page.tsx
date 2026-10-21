import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/context";
import { signupOpen } from "@/lib/signup";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  await requireUser();
  const t = await getTranslations("onboarding");
  // With sign-up closed nobody can create a company here; they need an invitation.
  const open = await signupOpen();
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">{open ? t("title") : t("closedTitle")}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{open ? t("description") : t("closed")}</p>
      {open && <OnboardingForm />}
    </Card>
  );
}
