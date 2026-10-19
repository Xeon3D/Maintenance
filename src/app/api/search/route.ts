import { getContext } from "@/lib/context";
import { searchWorkOrders } from "@/lib/search";

/** Fuzzy search over work orders for the field app (the web page /search calls the library directly). */
export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return Response.json({ error: "forbidden" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 200);
  const found = await searchWorkOrders(ctx.db, ctx.organization.id, q, {}, 30);
  return Response.json(found, { headers: { "Cache-Control": "private, no-store" } });
}
