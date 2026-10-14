import { NextResponse } from "next/server";

/**
 * A redirect within the app with a *relative* Location. Behind a reverse proxy a route handler's req.url is
 * the server's internal address (e.g. http://0.0.0.0:3000), so absolute URLs built from it send browsers
 * somewhere unreachable. Only app paths are accepted ("/x", never "//host" or a full URL).
 */
export function redirectTo(path: string, status: 303 | 307 = 307) {
  const safe = /^\/(?![/\\])/.test(path) ? path : "/";
  return new NextResponse(null, { status, headers: { Location: safe, "Cache-Control": "no-store" } });
}
