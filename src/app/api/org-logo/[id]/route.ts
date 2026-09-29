import { prisma } from "@/lib/db/client";
import { getObject } from "@/lib/storage";

// Company logos are public (QR label pages, emails, the login-free portal pages link them), so this
// route needs no session. It serves only the logo, nothing else about the organisation.
// URLs carry ?v=<updatedAt>, so the response can be cached for a long time.

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg" };

export async function GET(_req: Request, { params }: RouteContext<"/api/org-logo/[id]">) {
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id }, select: { logoUrl: true } });
  if (!org?.logoUrl) return new Response("Not found", { status: 404 });
  const ext = org.logoUrl.split(".").pop() ?? "";
  const data = await getObject(org.logoUrl).catch(() => null);
  if (!data || !TYPES[ext]) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
