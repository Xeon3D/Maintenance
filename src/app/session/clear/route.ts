import { NextResponse, type NextRequest } from "next/server";
import { expiredSessionCookie, isSessionCookie } from "@/lib/session-cookie";

// Ends a session the server can't use any more — its account no longer exists (e.g. after a backup was
// restored, or a factory reset) or was erased — and goes to the sign-in page. Without this, proxy.ts
// would keep sending the still-valid cookie from /login to the app and the app back to /login: a loop.
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.nextUrl));
  for (const { name } of req.cookies.getAll()) {
    if (isSessionCookie(name)) res.cookies.set(name, "", expiredSessionCookie(name));
  }
  return res;
}
