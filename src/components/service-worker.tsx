"use client";

import { useEffect } from "react";

/** Registers /sw.js on every page (offline field app shell + web push). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
