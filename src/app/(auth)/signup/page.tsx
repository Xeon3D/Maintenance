import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { signupOpen } from "@/lib/signup";
import { SignupForm } from "../auth-forms";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, email } = await searchParams;
  const n = typeof next === "string" ? next : undefined;
  // Coming from an invitation link: create just the user, the invite page adds the membership.
  const fromInvite = !!n?.startsWith("/invite/");
  // Closed sign-up still lets invited people create their account (signupAction checks the invitation).
  if (!fromInvite && !(await signupOpen())) {
    const t = await getTranslations("auth");
    return (
      <Card className="p-6">
        <h1 className="mb-2 text-lg font-semibold">{t("signupClosedTitle")}</h1>
        <p className="mb-5 text-sm text-muted">{t("signupClosed")}</p>
        <p className="text-center text-sm">
          <Link href="/login" className="text-muted hover:text-brand">
            {t("backToSignIn")}
          </Link>
        </p>
      </Card>
    );
  }
  return <SignupForm next={n} withCompany={!fromInvite} email={typeof email === "string" ? email : undefined} />;
}
