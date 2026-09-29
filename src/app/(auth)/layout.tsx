import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTheme } from "@/lib/theme-server";
import { getAppName } from "@/lib/server-settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-semibold tracking-tight text-brand">{await getAppName()}</div>
          <p className="mt-2 text-sm text-muted">{t("auth.tagline")}</p>
        </div>
        {children}
        <div className="mt-6 flex justify-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle initial={await getTheme()} />
        </div>
      </div>
    </div>
  );
}
