import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/client";

// Web push via VAPID. Without VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, push is simply off.

let configured = false;

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ready() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
    configured = true;
  }
  return true;
}

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

/** Sends to every device the user subscribed; subscriptions the push service reports gone are removed. */
export async function sendPush(userId: string, payload: PushPayload) {
  if (!ready()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
        .catch(async (e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
          else console.error("[push]", e);
        }),
    ),
  );
}
