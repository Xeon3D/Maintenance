import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Button, Card } from "@/components/ui";
import { prisma } from "@/lib/db/client";

// Public landing for asset QR labels. Staff of the owning org go straight to the asset;
// everyone else sees only the asset name and org (the request form arrives with the Requests module).
export default async function QrLandingPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const asset = await prisma.asset.findUnique({
    where: { qrToken: token },
    select: { id: true, name: true, organizationId: true, organization: { select: { name: true } } },
  });
  if (!asset) notFound();

  const session = await auth();
  if (session?.user?.id) {
    const m = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: asset.organizationId } },
    });
    if (m?.active && m.role !== "REQUESTER") redirect(`/assets/${asset.id}`);
  }

  const t = await getTranslations();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">{asset.organization.name}</div>
        <h1 className="mt-2 text-lg font-semibold">{asset.name}</h1>
        <p className="mt-2 text-sm text-muted">{t("qr.landing")}</p>
        {!session?.user && (
          <Link href={`/login?next=/r/${token}`} className="mt-5 block">
            <Button className="w-full">{t("auth.signIn")}</Button>
          </Link>
        )}
      </Card>
    </div>
  );
}
