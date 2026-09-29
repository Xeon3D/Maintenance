import { ImageResponse } from "next/og";

// App icons, drawn at request time (no binary files in the repo). Public: the proxy skips *.png.
const ICONS: Record<string, { size: number; pad: number; radius: number; mono?: boolean }> = {
  "192.png": { size: 192, pad: 0, radius: 36 },
  "512.png": { size: 512, pad: 0, radius: 96 },
  "maskable.png": { size: 512, pad: 0, radius: 0 }, // full bleed; the glyph stays inside the safe zone
  "apple.png": { size: 180, pad: 0, radius: 0 },
  "badge.png": { size: 96, pad: 0, radius: 0, mono: true }, // Android status-bar badge: white on transparent
};

export async function GET(_req: Request, { params }: RouteContext<"/icons/[file]">) {
  const { file } = await params;
  const spec = ICONS[file];
  if (!spec) return new Response("Not found", { status: 404 });
  const { size, radius, mono } = spec;
  const glyph = Math.round(size * (file === "maskable.png" ? 0.42 : 0.56));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: mono ? "transparent" : "#1f4f8f",
          borderRadius: radius,
          color: "#ffffff",
          fontSize: glyph,
          fontWeight: 700,
          letterSpacing: -glyph * 0.04,
        }}
      >
        V
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
