import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { prisma } from "@/lib/db/client";
import { PublicRequestForm } from "./public-form";

// Public landing for asset QR labels.
//  - staff of the owning org → the asset page
//  - client-portal users of that org → portal request form prefilled with the asset
//  - anyone else → a short anonymous request form (shows only the asset and org name)
export default async function QrLandingPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const asset = await prisma.asset.findUnique({
    where: { qrToken: token },
    select: { id: true, name: true, organizationId: true, archivedAt: true, organization: { select: { name: true } } },
  });
  if (!asset || asset.archivedAt) notFound();

  const session = await auth();
  if (session?.user?.id) {
    const m = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: asset.organizationId } },
    });
    if (m?.active) redirect(m.role === "REQUESTER" ? `/portal/requests/new?assetId=${asset.id}` : `/assets/${asset.id}`);
  }

  const t = await getTranslations();
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      <Card className="w-full max-w-md p-6">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">{asset.organization.name}</div>
          <h1 className="mt-2 text-lg font-semibold">{asset.name}</h1>
          <p className="mb-5 mt-1 text-sm text-muted">{t("qr.intro")}</p>
        </div>
        <PublicRequestForm token={token} />
        {!session?.user && (
          <p className="mt-5 text-center text-xs text-muted">
            {t("qr.haveAccount")}{" "}
            <Link href={`/login?next=/r/${token}`} className="font-medium text-brand">
              {t("auth.signIn")}
            </Link>
          </p>
        )}
      </Card>
      <div className="mt-4">
        <LocaleSwitcher />
      </div>
    </div>
  );
}
