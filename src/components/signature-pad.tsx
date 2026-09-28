"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = { toBlob: () => Promise<Blob | null>; clear: () => void; isEmpty: () => boolean };

/** Finger/mouse signature canvas. Exports a transparent PNG. */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void }>(function SignaturePad(
  { onChange },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  useImperativeHandle(ref, () => ({
    toBlob: () => new Promise((r) => canvas.current!.toBlob(r, "image/png")),
    clear: () => {
      const c = canvas.current!;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      setEmpty(true);
      onChange?.(true);
    },
    isEmpty: () => empty,
  }));

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <canvas
      ref={canvas}
      className="h-40 w-full touch-none rounded-md border border-dashed border-gray-300 bg-white"
      onPointerDown={(e) => {
        drawing.current = true;
        canvas.current!.setPointerCapture(e.pointerId);
        const ctx = canvas.current!.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(...point(e));
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = canvas.current!.getContext("2d")!;
        ctx.lineTo(...point(e));
        ctx.stroke();
        if (empty) {
          setEmpty(false);
          onChange?.(false);
        }
      }}
      onPointerUp={() => (drawing.current = false)}
      onPointerLeave={() => (drawing.current = false)}
    />
  );
});
