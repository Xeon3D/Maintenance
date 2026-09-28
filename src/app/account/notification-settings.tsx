"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BellOff, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui";
import type { Channels, NotificationType } from "@/lib/notification-types";
import { savePrefsAction, subscribePushAction, testPushAction, unsubscribePushAction } from "./actions";

/** Email / push toggles per notification type; saved as you click. */
export function NotificationPrefs({ types, initial }: { types: NotificationType[]; initial: Record<string, Channels> }) {
  const t = useTranslations("profile");
  const [prefs, setPrefs] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (type: NotificationType, channel: keyof Channels) => {
    const next = { ...prefs, [type]: { ...prefs[type], [channel]: !prefs[type][channel] } };
    setPrefs(next);
    setSaved(false);
    start(async () => {
      await savePrefsAction({ [type]: next[type] });
      setSaved(true);
    });
  };

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 font-medium">{t("event")}</th>
            <th className="w-16 py-2 text-center font-medium">{t("email")}</th>
            <th className="w-16 py-2 text-center font-medium">{t("push")}</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type} className="border-t border-border">
              <td className="py-2 pr-2">{t(`types.${type}`)}</td>
              {(["email", "push"] as const).map((c) => (
                <td key={c} className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={prefs[type][c]}
                    onChange={() => toggle(type, c)}
                    aria-label={`${t(`types.${type}`)} · ${t(c)}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 h-4 text-xs text-muted">{pending ? t("saving") : saved ? t("saved") : t("inAppAlways")}</p>
    </div>
  );
}

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = "unsupported" | "blocked" | "off" | "on" | "loading";

/** Turns web push on or off for this browser (each device subscribes separately). */
export function PushControl({ vapidKey }: { vapidKey: string | null }) {
  const t = useTranslations("profile");
  const [state, setState] = useState<PushState>("loading");
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async (): Promise<PushState> => {
      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
      if (Notification.permission === "denied") return "blocked";
      const reg = await navigator.serviceWorker.register("/sw.js");
      return (await reg.pushManager.getSubscription()) ? "on" : "off";
    };
    check()
      .catch((): PushState => "unsupported")
      .then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [vapidKey]);

  const enable = () =>
    start(async () => {
      setError(false);
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          return;
        }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey!) });
        await subscribePushAction(sub.toJSON(), navigator.userAgent);
        setState("on");
      } catch {
        setError(true);
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });

  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-sm text-muted">{t("pushUnsupported")}</p>;
  if (state === "blocked") return <p className="text-sm text-muted">{t("pushBlocked")}</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "on" ? (
        <>
          <span className="mr-2 inline-flex items-center gap-1.5 text-sm text-green-700">
            <BellRing className="size-4" />
            {t("pushOn")}
          </span>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await testPushAction(t("testTitle"), t("testBody"))))}>
            <Send className="size-4" />
            {t("pushTest")}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={disable}>
            <BellOff className="size-4" />
            {t("pushDisable")}
          </Button>
        </>
      ) : (
        <Button size="sm" disabled={pending} onClick={enable}>
          <BellRing className="size-4" />
          {t("pushEnable")}
        </Button>
      )}
      {error && <p className="w-full text-xs text-danger">{t("pushFailed")}</p>}
    </div>
  );
}
