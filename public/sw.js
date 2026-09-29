// Service worker: offline shell for the field app (/m) and web push.
//
// Caching is deliberately narrow:
//  - /_next/static/*  hashed build assets: cache-first in production, network-first on localhost
//                     (dev reuses file names, so cache-first would serve stale code)
//  - /m               the field app page: network-first, falls back to the last copy when offline
//  - other pages      network only; offline they get /offline.html (which links to /m)
//  - manifest/icons   stale-while-revalidate (also the company logo, shown in the field app)
// API calls, uploads and RSC requests are never cached: the field app keeps its data in IndexedDB.

const VERSION = "v5";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);
const NAV_TIMEOUT_MS = 5000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(["/offline.html"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The field app asks us to keep itself and the scripts it loaded (they were fetched before we controlled the page).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-field" || event.origin !== self.location.origin) return;
  const urls = (event.data.urls || []).filter((u) => typeof u === "string").slice(0, 200);
  event.waitUntil(
    Promise.all(
      urls.map(async (u) => {
        const url = new URL(u, self.location.origin);
        if (url.origin !== self.location.origin) return;
        const res = await fetch(url, { credentials: "same-origin" }).catch(() => null);
        if (!okToCache(res)) return;
        const cache = await caches.open(url.pathname === "/m" ? PAGES : STATIC);
        await cache.put(url.pathname === "/m" ? "/m" : url.href, res);
      }),
    ),
  );
});

/** Only real, same-origin 200s — never a redirect to the login page. */
function okToCache(res) {
  return !!res && res.ok && res.type === "basic" && !res.redirected;
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (okToCache(res)) (await caches.open(STATIC)).put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName, key) {
  try {
    const res = await Promise.race([fetch(request), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS))]);
    if (okToCache(res)) (await caches.open(cacheName)).put(key || request, res.clone());
    return res;
  } catch (e) {
    const hit = await caches.match(key || request);
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (okToCache(res)) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(DEV ? networkFirst(request, STATIC) : cacheFirst(request));
    return;
  }
  if (request.mode === "navigate") {
    if (url.pathname === "/m") {
      event.respondWith(networkFirst(request, PAGES, "/m").catch(() => caches.match("/offline.html")));
    } else {
      event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error()));
    }
    return;
  }
  if (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/api/org-logo/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ── Web push (phase 7)

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Notification", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/192.png",
      badge: "/icons/badge.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Focus an open tab on the target page if there is one, otherwise open it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      for (const tab of tabs) {
        if (new URL(tab.url).origin === url.origin && "focus" in tab) {
          tab.navigate(url.href);
          return tab.focus();
        }
      }
      return self.clients.openWindow(url.href);
    }),
  );
});
