import { getContext } from "@/lib/context";
import { findMac } from "@/lib/scan-codes";

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
  // A MAC address (from a label's barcode or typed), however it was written on the asset.
  const mac = findMac(code);
  if (mac) {
    const hex = mac.replace(/:/g, "");
    const forms = [mac, mac.replace(/:/g, "-"), hex, `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8)}`];
    const byMac = await ctx.db.asset.findFirst({
      where: { archivedAt: null, OR: forms.map((f) => ({ macAddress: { equals: f, mode: "insensitive" as const } })) },
      select: { id: true },
    });
    if (byMac) return Response.json({ match: { type: "asset", id: byMac.id, href: `/assets/${byMac.id}` } });
  }
  return Response.json({ match: null });
}
