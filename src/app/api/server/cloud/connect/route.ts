import { NextResponse } from "next/server";
import { requireServerAdmin } from "@/lib/server-admin";
import { getServerSettings } from "@/lib/server-settings";
import { oauthState } from "@/lib/backup-copies";
import { onedriveAuthorizeUrl } from "@/lib/cloud/onedrive";
import { gdriveAuthorizeUrl } from "@/lib/cloud/gdrive";
import { cloudRedirectUri } from "@/lib/cloud/oauth-paths";
import { redirectTo } from "@/lib/redirect";

// Settings → Server → "Connect": sends the server admin to Microsoft / Google to authorise backup uploads.
export async function GET(req: Request) {
  let userId: string;
  try {
    userId = (await requireServerAdmin()).user.id;
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const provider = new URL(req.url).searchParams.get("provider");
  const c = (await getServerSettings()).backupCopies.cloud;
  const redirectUri = await cloudRedirectUri();
  const state = oauthState(userId, provider ?? "");
  if (provider === "onedrive" && c.onedrive.clientId) return NextResponse.redirect(onedriveAuthorizeUrl(c.onedrive, redirectUri, state));
  if (provider === "gdrive" && c.gdrive.clientId) return NextResponse.redirect(gdriveAuthorizeUrl(c.gdrive, redirectUri, state));
  return redirectTo("/settings/server?cloud=missingApp#backup-copies");
}
