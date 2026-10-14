import { getTranslations } from "next-intl/server";

/** Public demo servers (DEMO_MODE=true): a reminder on every page not to type real personal data. */
export async function DemoBanner() {
  if (process.env.DEMO_MODE !== "true") return null;
  const t = await getTranslations("demo");
  return (
    <div role="note" className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800">
      {t("banner")}
    </div>
  );
}
