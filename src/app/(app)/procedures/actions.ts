"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { enumOf } from "@/lib/forms";
import { localizeTemplate, PROCEDURE_TEMPLATES } from "@/lib/procedure-templates";
import { ChecklistItemType, SystemType } from "@/generated/prisma/enums";

const itemSchema = z.object({
  type: enumOf(ChecklistItemType),
  label: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).nullable().default(null),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  unit: z.string().trim().max(20).nullable().default(null),
});

const procedureSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).nullable(),
  system: enumOf(SystemType).nullable(),
  items: z.array(itemSchema).max(200),
});

export type ProcedureInput = z.input<typeof procedureSchema>;

export async function saveProcedureAction(id: string | null, input: ProcedureInput): Promise<{ error?: string }> {
  const ctx = await requirePermission("procedures.manage");
  const parsed = procedureSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" };
  const { items, ...data } = parsed.data;
  const rows = items.map((it, sortOrder) => ({ ...it, sortOrder, required: it.type === "HEADING" ? false : it.required }));

  let procId = id;
  if (id) {
    if (!(await ctx.db.procedure.count({ where: { id } }))) return { error: "notFound" };
    // Work orders keep their own copy of the items, so replacing them here is safe.
    await ctx.db.$transaction([
      ctx.db.procedureItem.deleteMany({ where: { procedureId: id } }),
      ctx.db.procedure.update({ where: { id }, data: { ...data, items: { create: rows } } }),
    ]);
  } else {
    procId = (await ctx.db.procedure.create({ data: { ...data, organizationId: ctx.organization.id, items: { create: rows } } })).id;
  }
  revalidatePath("/procedures");
  redirect(`/procedures/${procId}`);
}

export async function setProcedureArchivedAction(id: string, archived: boolean) {
  const ctx = await requirePermission("procedures.manage");
  await ctx.db.procedure.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/procedures");
  revalidatePath(`/procedures/${id}`);
}

export async function duplicateProcedureAction(id: string) {
  const ctx = await requirePermission("procedures.manage");
  const p = await ctx.db.procedure.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!p) throw new Error("Not found");
  const copy = await ctx.db.procedure.create({
    data: {
      organizationId: ctx.organization.id,
      name: `${p.name} (2)`,
      description: p.description,
      system: p.system,
      items: {
        create: p.items.map(({ sortOrder, type, label, description, required, options, unit }) => ({ sortOrder, type, label, description, required, options, unit })),
      },
    },
  });
  revalidatePath("/procedures");
  redirect(`/procedures/${copy.id}`);
}

export async function installTemplatesAction(keys: string[]) {
  const ctx = await requirePermission("procedures.manage");
  const locale = (await getLocale()) === "pt" ? "pt" : "en";
  const chosen = PROCEDURE_TEMPLATES.filter((t) => keys.includes(t.key));
  for (const tpl of chosen) {
    const { items, ...data } = localizeTemplate(tpl, locale);
    await ctx.db.procedure.create({ data: { ...data, organizationId: ctx.organization.id, items: { create: items } } });
  }
  revalidatePath("/procedures");
}
