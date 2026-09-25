import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** Public origin for links printed on labels. APP_URL wins; otherwise the request host. */
export async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function assetQrUrl(qrToken: string) {
  return `${await appOrigin()}/r/${qrToken}`;
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}
