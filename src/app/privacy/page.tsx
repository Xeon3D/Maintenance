import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { privacyPath } from "@/lib/privacy";

// Linked from sign-in, where no company is known yet. A single-company server (the usual install)
// shows that company's notice; with several companies each one links its own page instead.
export default async function PrivacyIndex() {
  const orgs = await prisma.organization.findMany({ select: { slug: true }, orderBy: { createdAt: "asc" }, take: 2 });
  if (orgs.length !== 1) notFound();
  redirect(privacyPath(orgs[0]));
}
