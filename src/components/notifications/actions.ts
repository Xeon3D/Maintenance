"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/context";

export async function markAllReadAction() {
  const ctx = await getContext();
  await ctx.db.notification.updateMany({ where: { userId: ctx.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
