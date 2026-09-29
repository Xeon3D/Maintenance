import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";
import { FieldApp } from "./field-app";

export const metadata = { title: "Field" };

/**
 * The offline field app for technicians. The service worker keeps this page (and its scripts) so it
 * opens without a connection; everything else happens client-side against IndexedDB.
 */
export default async function FieldPage() {
  const ctx = await getContext();
  if (ctx.role === "REQUESTER") redirect("/portal");
  if (!ctx.can("workOrders.execute")) redirect("/dashboard");
  return <FieldApp user={{ id: ctx.user.id, name: ctx.user.name }} org={ctx.organization.name} />;
}
