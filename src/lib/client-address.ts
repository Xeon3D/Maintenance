// The client's address behind the reverse proxy, for rate limits and the audit log.
// Each proxy appends the address it got the request from to X-Forwarded-For (Next.js fills it in from the socket
// only when it's missing), so the entries on the right were written by our proxies and the ones on the left are
// whatever the client sent. TRUSTED_PROXY_HOPS = proxies in front of the app: 1 (default) for Nginx Proxy Manager,
// 2 with e.g. Cloudflare in front of it.

export function proxyHops(value = process.env.TRUSTED_PROXY_HOPS) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** The address the outermost trusted proxy saw, else X-Real-IP; null when neither header is there. */
export function clientAddressFrom(headers: Headers, hops = proxyHops()): string | null {
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - hops)];
  return headers.get("x-real-ip")?.trim() || null;
}
