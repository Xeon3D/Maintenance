import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// Routes reachable without signing in.
const PUBLIC_PREFIXES = ["/login", "/signup", "/invite", "/forgot-password", "/factory-reset", "/reset-password/", "/r/", "/api/auth", "/api/cron/", "/sw.js", "/offline.html", "/manifest.webmanifest", "/api/org-logo/", "/api/version"]; // cron routes check CRON_SECRET

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (req.auth && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/|api/server/backups/upload|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
