import "server-only";
import { getObject } from "@/lib/storage";
import { brandColor, companyLines } from "@/lib/branding";
import type { Organization } from "@/generated/prisma/client";

/** Everything the PDF documents need to print the company's letterhead and footer. */
export type Letterhead = {
  name: string;
  lines: string[];
  logo: { data: Buffer; format: "png" | "jpg" } | null;
  color: string;
  footer: string | null;
};

export async function letterhead(org: Organization, taxLabel: string): Promise<Letterhead> {
  let logo: Letterhead["logo"] = null;
  if (org.logoUrl) {
    const data = await getObject(org.logoUrl).catch(() => null);
    const format = org.logoUrl.endsWith(".png") ? "png" : org.logoUrl.endsWith(".jpg") ? "jpg" : null;
    if (data && format) logo = { data, format };
  }
  return { name: org.name, lines: companyLines(org, taxLabel), logo, color: brandColor(org), footer: org.reportFooter?.trim() || null };
}
