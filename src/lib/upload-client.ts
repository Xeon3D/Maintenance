"use client";

export type UploadTarget =
  | { workOrderId: string }
  | { workOrderItemId: string }
  | { assetId: string }
  | { villaId: string }
  | { partId: string }
  | { purchaseOrderId: string }
  | { articleId: string }
  | { draftForVillaId: string };
export type Uploaded = { id: string; url: string; filename: string; mimeType: string };

const MAX_EDGE = 2000;

/** Downscale phone photos to ≤2000px JPEG before upload (keeps reports and storage small). */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/png") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg" && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // e.g. HEIC the browser can't decode; the server will reject unsupported types
  }
}

/** Uploads a photo, PDF or video. Videos should go through `prepareVideo()` (lib/video-client.ts) first. */
export async function uploadFile(file: File | Blob, target: UploadTarget, filename = "file"): Promise<Uploaded> {
  if (file.type.startsWith("video/")) return uploadVideo(file, target, file instanceof File ? file.name : filename);
  const f = file instanceof File ? await shrinkImage(file) : new File([file], filename, { type: file.type });
  const body = new FormData();
  body.set("file", f);
  body.set("target", JSON.stringify(target));
  const res = await fetch("/api/uploads", { method: "POST", body });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "uploadFailed");
  return res.json();
}

/** Videos are sent as the raw request body (streamed to disk on the server); target and name go in headers. */
async function uploadVideo(file: Blob, target: UploadTarget, filename: string): Promise<Uploaded> {
  const res = await fetch("/api/uploads/video", {
    method: "POST",
    body: file,
    headers: {
      "content-type": file.type,
      "x-upload-target": encodeURIComponent(JSON.stringify(target)),
      "x-upload-filename": encodeURIComponent(filename),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "uploadFailed");
  return res.json();
}

/** Error codes from uploads that have their own message under `files.`; anything else is `files.failed`. */
export const UPLOAD_ERRORS = ["notFound", "forbidden", "badTarget", "badType", "tooLarge", "videoTooLong", "badVideo", "videoUnavailable"];
