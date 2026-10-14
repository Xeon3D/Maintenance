import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { companyLines, logoSrc, type LogoOrg } from "@/lib/branding";
import { privacyPath, TERMS_SECTIONS } from "@/lib/privacy";

type Org = LogoOrg & {
  slug: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
};

/** The built-in terms of use, filled with the company's details. */
export async function TermsNotice({ org }: { org: Org }) {
  const t = await getTranslations();
  const logo = logoSrc(org);
  const company = org.legalName || org.name;
  const contact = [org.email, org.phone].filter(Boolean).join(" · ") || t("privacy.contactFallback");
  return (
    <Card className="w-full max-w-2xl p-6 sm:p-8">
      <div className="mb-6 border-b border-border pb-5">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="mb-3 h-12 max-w-40 object-contain" />
        )}
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">{org.name}</div>
        <h1 className="mt-1 text-xl font-semibold">{t("terms.title")}</h1>
        <div className="mt-2 space-y-0.5 text-xs text-muted">
          {companyLines(org, t("company.taxId")).map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>
      <div className="space-y-4 text-sm leading-relaxed">
        {TERMS_SECTIONS.map((s) => (
          <section key={s}>
            <h2 className="mb-1 font-medium">{t(`terms.sections.${s}.title`)}</h2>
            <p className="whitespace-pre-line text-muted">{t(`terms.sections.${s}.body`, { company, contact })}</p>
            {s === "privacy" && (
              <Link href={privacyPath(org)} className="mt-1 inline-block text-brand hover:underline">
                {t("privacy.title")}
              </Link>
            )}
          </section>
        ))}
      </div>
    </Card>
  );
}
