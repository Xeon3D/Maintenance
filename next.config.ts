import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Rendered server-side only (PDF service reports).
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // CSV imports are sent to a server action (5 MB cap enforced in the action).
    serverActions: { bodySizeLimit: "6mb" },
    // File uploads go through /api/uploads (15 MB cap enforced in the handler).
    proxyClientMaxBodySize: "16mb",
  },
};

export default withNextIntl(nextConfig);
