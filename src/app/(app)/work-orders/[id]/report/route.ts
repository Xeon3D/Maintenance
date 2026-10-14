import { getContext } from "@/lib/context";
import { renderServiceReport } from "@/lib/service-report";

export async function GET(_req: Request, { params }: RouteContext<"/work-orders/[id]/report">) {
  const { id } = await params;
  const ctx = await getContext();
  // Staff, or a client-portal user for a client-visible WO on one of their villas.
  const portalScope =
    ctx.role === "REQUESTER" && ctx.membership.clientId ? { clientVisible: true, villa: { clientId: ctx.membership.clientId } } : null;
  if (!ctx.can("internal.view") && !portalScope) return new Response("Not found", { status: 404 });

  const report = await renderServiceReport(ctx, { id, ...(ctx.can("internal.view") ? {} : portalScope) });
  if (!report) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(report.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="WO-${report.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
