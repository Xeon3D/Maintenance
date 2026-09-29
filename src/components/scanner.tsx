"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button, Input } from "@/components/ui";

// Camera scanner for asset QR labels and part barcodes. Uses the browser's BarcodeDetector where it
// exists (Chrome/Android: QR, EAN, UPC, Code 128/39…); elsewhere (e.g. iPhone Safari) it decodes QR
// codes with jsQR, and anything can be typed in by hand.

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

const FORMATS = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "data_matrix"];

/** Pulls the QR token out of an asset-label URL ("…/r/<token>"); null for anything else. */
export function qrTokenOf(text: string) {
  try {
    const m = new URL(text).pathname.match(/^\/r\/([A-Za-z0-9_-]{10,40})$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function Scanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const t = useTranslations("scan");
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const [manual, setManual] = useState("");
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const finish = (text: string) => {
      if (done.current || !text) return;
      done.current = true;
      navigator.vibrate?.(60);
      onResult(text.trim());
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch (e) {
        setError((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
        return;
      }
      if (cancelled || !video.current) return;
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);

      const native = window.BarcodeDetector ? new window.BarcodeDetector({ formats: FORMATS }) : null;
      const jsQR = native ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      timer = setInterval(async () => {
        const v = video.current;
        if (!v || v.readyState < 2 || done.current) return;
        if (native) {
          const codes = await native.detect(v).catch(() => []);
          if (codes[0]) finish(codes[0].rawValue);
          return;
        }
        const scale = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR!(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) finish(code.data);
      }, 250);
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white" role="dialog" aria-modal="true" aria-label={t("title")}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t("title")}</h2>
        <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label={t("close")}>
          <X className="size-5" />
        </button>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-black">
        {error ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-sm">{t(error)}</p>
        ) : (
          <>
            <video ref={video} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80" />
          </>
        )}
      </div>
      <p className="mx-auto mt-3 max-w-sm text-center text-xs text-white/70">{t("hint")}</p>
      <form
        className="mx-auto mt-4 flex w-full max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onResult(manual.trim());
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("manual")} className="text-foreground" aria-label={t("manual")} />
        <Button type="submit" variant="secondary" disabled={!manual.trim()}>
          {t("go")}
        </Button>
      </form>
    </div>
  );
}
