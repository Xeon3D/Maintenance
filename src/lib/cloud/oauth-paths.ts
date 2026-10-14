import "server-only";
import { appOrigin } from "@/lib/qr";

/** The sign-in redirect address to register with Microsoft / Google (shown in Settings → Server). */
export async function cloudRedirectUri() {
  return `${await appOrigin()}/api/server/cloud/callback`;
}
