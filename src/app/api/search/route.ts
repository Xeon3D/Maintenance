import { getContext } from "@/lib/context";
import { searchWorkOrders } from "@/lib/search";
import { searchArticles } from "@/lib/knowledge-search";

/** Fuzzy search over work orders and knowledge-base articles for the field app (the web page /search calls the libraries directly). */
export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return Response.json({ error: "forbidden" }, { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 200);
  const [found, articles] = await Promise.all([searchWorkOrders(ctx.db, ctx.organization.id, q, {}, 30), searchArticles(ctx.db, q, {}, 5)]);
  return Response.json({ ...found, articles }, { headers: { "Cache-Control": "private, no-store" } });
}
