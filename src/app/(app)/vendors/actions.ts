"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { enumOf, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { SystemType, VendorType } from "@/generated/prisma/enums";

const vendorSchema = z.object({
  name: str(150),
  type: enumOf(VendorType),
  email: optStr(200),
  phone: optStr(50),
  // Rendered as a link, so only http(s) — never javascript: or data: URLs.
  website: optStr(300).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "invalid_url"),
  taxId: optStr(50),
  address: optStr(500),
  notes: optStr(5000),
});

export async function saveVendorAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("vendors.manage");
  const parsed = parseForm(vendorSchema, form);
  if (parsed.error) return parsed.error;
  // Checkbox group: Object.fromEntries in parseForm keeps only one value, so read them all here.
  const systems = z.array(enumOf(SystemType)).parse(form.getAll("systems"));
  const data = { ...parsed.data, systems };

  let vendorId = id;
  if (id) {
    await ctx.db.vendor.update({ where: { id }, data });
  } else {
    const created = await ctx.db.vendor.create({ data: { ...data, organizationId: ctx.organization.id } });
    vendorId = created.id;
  }
  revalidatePath("/vendors");
  redirect(`/vendors/${vendorId}`);
}

export async function setVendorArchivedAction(id: string, archived: boolean) {
  const ctx = await requirePermission("vendors.manage");
  await ctx.db.vendor.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}`);
}

const contactSchema = z.object({
  name: str(150),
  role: optStr(100),
  email: optStr(200),
  phone: optStr(50),
});

export async function addVendorContactAction(vendorId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("vendors.manage");
  await assertOwned(ctx.db, "vendor", [vendorId]);
  const parsed = parseForm(contactSchema, form);
  if (parsed.error) return parsed.error;
  await ctx.db.vendorContact.create({ data: { ...parsed.data, vendorId } });
  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true };
}

export async function deleteVendorContactAction(vendorId: string, contactId: string) {
  const ctx = await requirePermission("vendors.manage");
  await assertOwned(ctx.db, "vendor", [vendorId]);
  await ctx.db.vendorContact.deleteMany({ where: { id: contactId, vendorId } });
  revalidatePath(`/vendors/${vendorId}`);
}
