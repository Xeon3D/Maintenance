// Service worker. Phase 7: web push only (phase 9 adds offline caching here).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "VillaOps", {
      body: data.body || "",
      tag: data.tag,
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
