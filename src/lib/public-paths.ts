// Routes reachable without signing in (checked by src/proxy.ts). Each entry matches that path and the paths under
// it ("/privacy" → "/privacy", "/privacy/x"), never a longer name ("/privacy-x"). Cron routes check CRON_SECRET.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/invite",
  "/forgot-password",
  "/factory-reset",
  "/reset-password",
  "/r",
  "/api/auth",
  "/api/cron",
  "/sw.js",
  "/offline.html",
  "/manifest.webmanifest",
  "/api/org-logo",
  "/api/version",
  "/privacy",
  "/terms",
  "/session/clear",
  "/api/calendar",
];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
