"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { enumOf, optDate, optId, optInt, optNumber, optStr, parseForm, str, type FormResult } from "@/lib/forms";
import { relinkClientWorkOrders } from "@/lib/contracts";
import { ContractStatus, SystemType } from "@/generated/prisma/enums";

const hours = () => optInt().refine((v) => v === null || (v >= 1 && v <= 24 * 365));

const contractSchema = z
  .object({
    clientId: str(40),
    villaId: optId(),
    name: str(150),
    status: enumOf(ContractStatus),
    startDate: z.coerce.date(),
    endDate: optDate(),
    responseTimeHours: hours(),
    resolutionTimeHours: hours(),
    includedVisits: optInt().refine((v) => v === null || (v >= 0 && v <= 365)),
    monthlyFee: optNumber().refine((v) => v === null || (v >= 0 && v <= 10_000_000)),
    notes: optStr(5000),
  })
  .refine((c) => !c.endDate || c.endDate >= c.startDate, { path: ["endDate"], message: "endBeforeStart" })
  .refine((c) => c.responseTimeHours == null || c.resolutionTimeHours == null || c.resolutionTimeHours >= c.responseTimeHours, {
    path: ["resolutionTimeHours"],
    message: "resolutionBeforeResponse",
  });

export async function saveContractAction(id: string | null, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("contracts.manage");
  const parsed = parseForm(contractSchema, form);
  if (parsed.error) return parsed.error;
  const systems = z.array(enumOf(SystemType)).parse(form.getAll("systems"));
  const data = { ...parsed.data, systems };

  // The client must be ours, and a villa must belong to that client.
  const client = await ctx.db.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
  if (!client) return { error: "validation", fieldErrors: { clientId: "invalid" } };
  if (data.villaId && !(await ctx.db.villa.count({ where: { id: data.villaId, clientId: data.clientId } }))) {
    return { error: "validation", fieldErrors: { villaId: "villaNotClients" } };
  }

  let contractId = id;
  let previousClient: string | null = null;
  if (id) {
    const before = await ctx.db.serviceContract.findUnique({ where: { id }, select: { clientId: true } });
    if (!before) return { error: "somethingWrong" };
    previousClient = before.clientId;
    await ctx.db.serviceContract.update({ where: { id }, data });
  } else {
    contractId = (await ctx.db.serviceContract.create({ data: { ...data, organizationId: ctx.organization.id } })).id;
  }
  await relinkClientWorkOrders(ctx.db, data.clientId);
  if (previousClient && previousClient !== data.clientId) await relinkClientWorkOrders(ctx.db, previousClient);

  revalidatePath("/contracts");
  revalidatePath(`/clients/${data.clientId}`);
  redirect(`/contracts/${contractId}`);
}

export async function deleteContractAction(id: string) {
  const ctx = await requirePermission("contracts.manage");
  const c = await ctx.db.serviceContract.findUnique({ where: { id }, select: { clientId: true } });
  if (!c) return;
  await ctx.db.serviceContract.delete({ where: { id } });
  await relinkClientWorkOrders(ctx.db, c.clientId);
  revalidatePath("/contracts");
  redirect("/contracts");
}
