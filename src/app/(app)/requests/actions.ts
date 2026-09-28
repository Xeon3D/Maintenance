"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/context";
import { enumOf, optEnumOf, optId, parseForm, str, type FormResult } from "@/lib/forms";
import { approveRequest, declineRequest, notifyRequester } from "@/lib/requests";
import { WorkOrderError } from "@/lib/work-orders";
import { Priority, SystemType, WorkOrderType } from "@/generated/prisma/enums";

const approveSchema = z.object({
  title: str(200),
  priority: enumOf(Priority),
  type: enumOf(WorkOrderType),
  system: optEnumOf(SystemType),
  teamId: optId(),
  dueDate: z.preprocess((v) => (v ? v : undefined), z.coerce.date().optional()).transform((v) => v ?? null),
});

export async function approveRequestAction(id: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("requests.approve");
  const parsed = parseForm(approveSchema, form);
  if (parsed.error) return parsed.error;
  let woId: string;
  try {
    const wo = await approveRequest(ctx, id, { ...parsed.data, assigneeIds: form.getAll("assigneeIds").map(String).filter(Boolean) });
    woId = wo.id;
  } catch (e) {
    if (e instanceof WorkOrderError) return { error: `wo.${e.code}` };
    return { error: "requests.notPending" };
  }
  revalidatePath("/requests");
  revalidatePath("/work-orders");
  redirect(`/work-orders/${woId}`);
}

export async function declineRequestAction(id: string, _: FormResult, form: FormData): Promise<FormResult> {
  const ctx = await requirePermission("requests.approve");
  const reason = z.string().trim().max(1000).parse(form.get("reason") ?? "") || null;
  try {
    await declineRequest(ctx.db, id, reason);
  } catch {
    return { error: "requests.notPending" };
  }
  const req = await ctx.db.request.findUnique({ where: { id } });
  if (req) await notifyRequester(ctx, req, "DECLINED", reason);
  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  return { ok: true };
}
