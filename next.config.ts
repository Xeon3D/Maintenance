import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // Rendered server-side only (PDF service reports).
  serverExternalPackages: ["@react-pdf/renderer"],
  // The service worker must always be revalidated so fixes reach devices promptly.
  async headers() {
    return [
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
