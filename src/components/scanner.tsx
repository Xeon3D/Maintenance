"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Loader2, ScanText, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { codeFor, textCandidates, type ScanPurpose } from "@/lib/scan-codes";
import type { DecodeHintType } from "@zxing/library";

// Camera scanner for asset QR labels, part barcodes, serial numbers and MAC addresses.
//  - Barcodes and QR codes: the browser's BarcodeDetector where it reads them (Chrome on Android/macOS), else
//    ZXing in JavaScript (iPhone Safari, Firefox, Chrome on Windows): QR, Data Matrix, EAN/UPC, Code 128/39, ITF.
//  - Printed text (serial / MAC fields): "Read text" photographs the label and reads it with Tesseract (OCR,
//    files served from /ocr, so it works without a CDN), then offers the likely values to pick from.
// Anything can also be typed by hand.

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorClass = (new (opts: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> };
declare global {
  interface Window {
    BarcodeDetector?: DetectorClass;
  }
}

const FORMATS = ["qr_code", "data_matrix", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar"];
const LINEAR = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];

/** Pulls the QR token out of an asset-label URL ("…/r/<token>"); null for anything else. */
export function qrTokenOf(text: string) {
  try {
    const m = new URL(text).pathname.match(/^\/r\/([A-Za-z0-9_-]{10,40})$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

type Decode = (v: HTMLVideoElement) => Promise<string | null>;

/** The browser's own detector when it reads 1D barcodes too; null to use ZXing instead. */
async function nativeDecoder(): Promise<Decode | null> {
  const BD = window.BarcodeDetector;
  if (!BD) return null;
  const supported = (await BD.getSupportedFormats?.().catch(() => [])) ?? FORMATS;
  if (!LINEAR.some((f) => supported.includes(f))) return null;
  const detector = new BD({ formats: FORMATS.filter((f) => supported.includes(f)) });
  return async (v) => (await detector.detect(v).catch(() => []))[0]?.rawValue ?? null;
}

async function zxingDecoder(): Promise<Decode> {
  const zx = await import("@zxing/library");
  const reader = new zx.MultiFormatReader();
  const F = zx.BarcodeFormat;
  reader.setHints(
    new Map<DecodeHintType, unknown>([
      [zx.DecodeHintType.POSSIBLE_FORMATS, [F.QR_CODE, F.DATA_MATRIX, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR]],
      [zx.DecodeHintType.TRY_HARDER, true],
    ]),
  );
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (v) => {
    // Enough pixels for thin 1D bars, without decoding a full 4K frame four times a second.
    const scale = Math.min(1, 1280 / v.videoWidth);
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    try {
      const bitmap = new zx.BinaryBitmap(new zx.HybridBinarizer(new zx.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decodeWithState(bitmap).getText();
    } catch {
      return null; // nothing in this frame
    }
  };
}

/** The label area of the current frame (the box drawn over the preview), enlarged and in grey for OCR. */
function labelImage(v: HTMLVideoElement) {
  // The preview is a centred square (object-cover); the text box covers 84% × 50% of it.
  const side = Math.min(v.videoWidth, v.videoHeight);
  const w = side * 0.84;
  const h = side * 0.5;
  const sx = (v.videoWidth - w) / 2;
  const sy = (v.videoHeight - h) / 2;
  const scale = Math.max(1, 1600 / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.4)";
  ctx.drawImage(v, sx, sy, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

type OcrWorker = { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

type Ocr = { state: "idle" } | { state: "loading" } | { state: "reading" } | { state: "done"; candidates: string[] } | { state: "failed" };

export function Scanner({ onResult, onClose, purpose = "any" }: { onResult: (text: string) => void; onClose: () => void; purpose?: ScanPurpose }) {
  const t = useTranslations("scan");
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const [manual, setManual] = useState("");
  const [ocr, setOcr] = useState<Ocr>({ state: "idle" });
  const done = useRef(false);
  const paused = useRef(false);
  const worker = useRef<Promise<OcrWorker> | null>(null);
  const textMode = purpose !== "any";

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });
  const finish = useCallback((text: string) => {
    if (done.current || !text.trim()) return;
    done.current = true;
    navigator.vibrate?.(60);
    onResultRef.current(text.trim());
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (e) {
        setError((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
        return;
      }
      if (cancelled || !video.current) return;
      // Continuous autofocus where the camera offers it (small print on labels).
      const track = stream.getVideoTracks()[0];
      await track?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => undefined);
      video.current.srcObject = stream;
      await video.current.play().catch(() => undefined);

      const decode = (await nativeDecoder()) ?? (await zxingDecoder());
      let busy = false;
      timer = setInterval(async () => {
        const v = video.current;
        if (!v || v.readyState < 2 || done.current || paused.current || busy) return;
        busy = true;
        const text = await decode(v);
        busy = false;
        if (text) finish(codeFor(text, purpose));
      }, 250);
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
      void worker.current?.then((w) => w.terminate()).catch(() => undefined);
    };
  }, [purpose, finish]);

  async function readText() {
    const v = video.current;
    if (!v || v.readyState < 2) return;
    paused.current = true;
    const image = labelImage(v);
    try {
      if (!worker.current) {
        setOcr({ state: "loading" });
        worker.current = import("tesseract.js").then(({ createWorker }) =>
          createWorker("eng", 1, { workerPath: "/ocr/worker.min.js", corePath: "/ocr", langPath: "/ocr", gzip: true, workerBlobURL: false }),
        ) as Promise<OcrWorker>;
      }
      const w = await worker.current;
      setOcr({ state: "reading" });
      const { data } = await w.recognize(image);
      setOcr({ state: "done", candidates: textCandidates(data.text, purpose) });
    } catch (e) {
      console.error("[scanner] OCR failed", e);
      worker.current = null;
      setOcr({ state: "failed" });
    }
  }

  const retry = () => {
    paused.current = false;
    setOcr({ state: "idle" });
  };
  const titleKey = purpose === "mac" ? "titleMac" : purpose === "serial" ? "titleSerial" : "title";

  // Rendered on <body>: the scanner is often opened from inside another form.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-black/90 p-4 text-white" role="dialog" aria-modal="true" aria-label={t(titleKey)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t(titleKey)}</h2>
        <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label={t("close")}>
          <X className="size-5" />
        </button>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-lg bg-black">
        {error ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-sm">{t(error)}</p>
        ) : (
          <>
            <video ref={video} playsInline muted className="h-full w-full object-cover" />
            <div className={textMode ? "pointer-events-none absolute inset-x-[8%] inset-y-[25%] rounded-lg border-2 border-white/80" : "pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80"} />
            {(ocr.state === "loading" || ocr.state === "reading") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm">
                <Loader2 className="size-6 animate-spin" />
                {t(ocr.state === "loading" ? "ocrLoading" : "ocrReading")}
              </div>
            )}
          </>
        )}
      </div>
      <p className="mx-auto mt-3 max-w-sm text-center text-xs text-white/70">{t(purpose === "mac" ? "hintMac" : purpose === "serial" ? "hintSerial" : "hint")}</p>

      {textMode && !error && (
        <div className="mx-auto mt-3 w-full max-w-sm">
          {ocr.state === "done" || ocr.state === "failed" ? (
            <div className="rounded-lg bg-white/10 p-3 text-sm">
              {ocr.state === "done" && ocr.candidates.length > 0 ? (
                <>
                  <p className="mb-2 text-white/80">{t("ocrPick")}</p>
                  <div className="flex flex-col gap-1.5">
                    {ocr.candidates.map((c) => (
                      <button key={c} type="button" onClick={() => finish(c)} className="rounded-md bg-white/15 px-3 py-2 text-left font-mono hover:bg-white/25">
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-white/80">{t(ocr.state === "failed" ? "ocrFailed" : "ocrNothing")}</p>
              )}
              <Button type="button" variant="secondary" className="mt-3 w-full" onClick={retry}>
                {t("ocrRetry")}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="w-full" onClick={readText} disabled={ocr.state !== "idle"}>
              <ScanText className="size-4" />
              {t("readText")}
            </Button>
          )}
        </div>
      )}

      <form
        className="mx-auto mt-4 flex w-full max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation(); // the scanner can sit inside another form
          if (manual.trim()) finish(codeFor(manual, purpose));
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("manual")} className="text-foreground" aria-label={t("manual")} />
        <Button type="submit" variant="secondary" disabled={!manual.trim()}>
          {t("go")}
        </Button>
      </form>
    </div>,
    document.body,
  );
}
