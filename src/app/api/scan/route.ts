import { getContext } from "@/lib/context";

/** Resolves a scanned or typed code: part barcode/SKU, asset tag/serial, or an asset-label QR token. */
export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return Response.json({ error: "forbidden" }, { status: 403 });
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().slice(0, 200);
  if (!code) return Response.json({ match: null });
  const eq = { equals: code, mode: "insensitive" as const };

  const part = await ctx.db.part.findFirst({ where: { archivedAt: null, OR: [{ barcode: eq }, { sku: eq }] }, select: { id: true } });
  if (part) return Response.json({ match: { type: "part", id: part.id, href: `/parts/${part.id}` } });
  const asset = await ctx.db.asset.findFirst({ where: { archivedAt: null, OR: [{ qrToken: code }, { code: eq }, { serialNumber: eq }] }, select: { id: true } });
  if (asset) return Response.json({ match: { type: "asset", id: asset.id, href: `/assets/${asset.id}` } });
  return Response.json({ match: null });
}
