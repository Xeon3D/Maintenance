"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/context";
import { decryptField, encryptField } from "@/lib/crypto";

// Encrypted free-text secrets: villa access codes and device credentials.
// Reading requires `secrets.view` and is always audit-logged; writing requires the entity's manage permission.

const kindSchema = z.enum(["villa", "asset"]);
type Kind = z.infer<typeof kindSchema>;

export async function revealSecretAction(kind: Kind, id: string): Promise<string> {
  kindSchema.parse(kind);
  const ctx = await requirePermission("secrets.view");
  const row =
    kind === "villa"
      ? await ctx.db.villa.findUnique({ where: { id }, select: { secretsEnc: true } }).then((r) => r?.secretsEnc)
      : await ctx.db.asset.findUnique({ where: { id }, select: { credentialsEnc: true } }).then((r) => r?.credentialsEnc);
  if (row === undefined) throw new Error("Not found");
  await audit(ctx, `${kind}.secrets.view`, kind, id);
  return row ? decryptField(row) : "";
}

export async function saveSecretAction(kind: Kind, id: string, value: string) {
  kindSchema.parse(kind);
  const ctx = await requirePermission(kind === "villa" ? "clients.manage" : "assets.manage");
  const clean = z.string().max(5000).parse(value).trim();
  const enc = clean ? encryptField(clean) : null;
  if (kind === "villa") await ctx.db.villa.update({ where: { id }, data: { secretsEnc: enc } });
  else await ctx.db.asset.update({ where: { id }, data: { credentialsEnc: enc } });
  await audit(ctx, `${kind}.secrets.update`, kind, id, { cleared: !clean });
  revalidatePath(kind === "villa" ? `/villas/${id}` : `/assets/${id}`);
}
