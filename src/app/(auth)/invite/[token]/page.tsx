import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Button, Card } from "@/components/ui";
import { prisma } from "@/lib/db/client";
import { ACTIVE_ORG_COOKIE } from "@/lib/context";
import { signOutAction } from "../../actions";

async function loadInvite(token: string) {
  const invite = await prisma.invitation.findUnique({ where: { token }, include: { organization: true } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const t = await getTranslations();
  const invite = await loadInvite(token);

  if (!invite) {
    return (
      <Card className="p-6 text-center text-sm">{t("invite.invalid")}</Card>
    );
  }

  const session = await auth();
  const org = invite.organization.name;
  const role = t(`roles.${invite.role}`);
  const next = `/invite/${token}`;

  async function accept() {
    "use server";
    const s = await auth();
    const inv = await loadInvite(token);
    if (!s?.user?.id || !inv) redirect(next);
    const user = await prisma.user.findUnique({ where: { id: s.user.id } });
    if (!user || user.email !== inv.email) redirect(next);

    await prisma.$transaction([
      prisma.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: inv.organizationId } },
        create: { userId: user.id, organizationId: inv.organizationId, role: inv.role, clientId: inv.clientId },
        update: { role: inv.role, clientId: inv.clientId, active: true },
      }),
      prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    (await cookies()).set(ACTIVE_ORG_COOKIE, inv.organizationId, { path: "/", httpOnly: true, sameSite: "lax" });
    redirect("/dashboard");
  }

  const sessionEmail = session?.user?.email?.toLowerCase();

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">{t("invite.title", { org })}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">{t("invite.description", { org, role })}</p>

      {!session?.user ? (
        <div className="space-y-2">
          <Link href={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}>
            <Button className="w-full">{t("invite.createAccount")}</Button>
          </Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            <Button variant="secondary" className="w-full">
              {t("auth.signIn")}
            </Button>
          </Link>
        </div>
      ) : sessionEmail !== invite.email ? (
        <div className="space-y-4">
          <p className="text-sm">{t("invite.wrongAccount", { email: invite.email })}</p>
          <form action={signOutAction}>
            <Button variant="secondary" className="w-full">
              {t("common.signOut")}
            </Button>
          </form>
        </div>
      ) : (
        <form action={accept}>
          <Button className="w-full">{t("invite.accept")}</Button>
        </form>
      )}
    </Card>
  );
}
