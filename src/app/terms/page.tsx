import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { termsPath } from "@/lib/privacy";

// Like /privacy: a single-company server (the usual install) shows that company's terms.
export default async function TermsIndex() {
  const orgs = await prisma.organization.findMany({ select: { slug: true }, orderBy: { createdAt: "asc" }, take: 2 });
  if (orgs.length !== 1) notFound();
  redirect(termsPath(orgs[0]));
}
