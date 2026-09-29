import { APP_VERSION } from "@/lib/version";

// Public: lets the server settings page notice when the app is back after an update or restore.
export function GET() {
  return Response.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
