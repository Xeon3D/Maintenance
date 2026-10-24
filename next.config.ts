import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const dev = process.env.NODE_ENV !== "production";

// Content Security Policy: everything comes from this origin. Inline scripts are allowed because Next
// streams its hydration data inline and the theme boot script runs before paint (nonces would force
// every page to render dynamically and break the cached offline field app). Images may come from
// https sources only for release notes in Settings → Server. Dev needs eval and the HMR websocket.
// 'wasm-unsafe-eval' lets the OCR engine (public/ocr) compile WebAssembly; it does not allow JS eval.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Browsers ignore HSTS on plain http, so this is safe on a LAN install; behind the https proxy it
  // pins the domain to https for 180 days (subdomains untouched).
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera for QR/barcode scanning; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // Rendered server-side only (PDF service reports).
  serverExternalPackages: ["@react-pdf/renderer"],
  poweredByHeader: false,
  // The app doesn't use next/image; this turns the /_next/image optimizer endpoint off (it answers 404),
  // so its unauthenticated attack surface isn't exposed.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service-report PDF is shown framed in /report/[id] (which adds a back button), so this origin may frame
      // it. Later rules win for the same header key.
      {
        source: "/work-orders/:id/report",
        headers: [
          { key: "Content-Security-Policy", value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // The service worker must always be revalidated so fixes reach devices promptly.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  experimental: {
    // CSV imports are sent to a server action (5 MB cap enforced in the action).
    serverActions: { bodySizeLimit: "6mb" },
    // File uploads go through /api/uploads (15 MB cap enforced in the handler).
    proxyClientMaxBodySize: "16mb",
  },
};

export default withNextIntl(nextConfig);
