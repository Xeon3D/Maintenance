"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { assertOwned } from "@/lib/db/tenant";
import { enumOf, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { ClientType } from "@/generated/prisma/enums";

const clientSchema = z.object({
  name: str(150),
  type: enumOf(ClientType),
  email: optStr(200),
  phone: optStr(50),
  taxId: optStr(50),
  billingAddress: optStr(500),
  notes: optStr(5000),
});

export async function saveClientAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("clients.manage");
  const parsed = parseForm(clientSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;

  let clientId = id;
  if (id) {
    await ctx.db.client.update({ where: { id }, data });
  } else {
    const created = await ctx.db.client.create({ data: { ...data, organizationId: ctx.organization.id } });
    clientId = created.id;
  }
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function setClientArchivedAction(id: string, archived: boolean) {
  const ctx = await requirePermission("clients.manage");
  await ctx.db.client.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

const contactSchema = z.object({
  name: str(150),
  role: optStr(100),
  email: optStr(200),
  phone: optStr(50),
});

export async function addContactAction(clientId: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("clients.manage");
  await assertOwned(ctx.db, "client", [clientId]);
  const parsed = parseForm(contactSchema, form);
  if (parsed.error) return parsed.error;
  const { data } = parsed;
  const existing = await ctx.db.client.findUnique({ where: { id: clientId }, select: { _count: { select: { contacts: true } } } });
  await ctx.db.clientContact.create({ data: { ...data, clientId, isPrimary: existing?._count.contacts === 0 } });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function deleteContactAction(clientId: string, contactId: string) {
  const ctx = await requirePermission("clients.manage");
  await assertOwned(ctx.db, "client", [clientId]);
  await ctx.db.clientContact.deleteMany({ where: { id: contactId, clientId } });
  revalidatePath(`/clients/${clientId}`);
}
