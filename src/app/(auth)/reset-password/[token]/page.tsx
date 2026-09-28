import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { userForResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "../../auth-forms";

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const user = await userForResetToken(token);
  if (!user) {
    const t = await getTranslations("auth");
    return (
      <Card className="p-6 text-center">
        <p className="mb-4 text-sm">{t("resetExpired")}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand">
          {t("sendReset")}
        </Link>
      </Card>
    );
  }
  return <ResetPasswordForm token={token} email={user.email} />;
}
