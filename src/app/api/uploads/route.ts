import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";
import { putObject, fileUrl } from "@/lib/storage";
import { createAttachment, denyTarget, storageKey, targetSchema } from "@/lib/uploads";

// Photos and PDFs. Videos go to /api/uploads/video (streamed to disk, converted with ffmpeg).
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(req: Request) {
  const ctx = await getContext();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "noFile" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "badType" }, { status: 415 });

  let rawTarget: unknown;
  try {
    rawTarget = JSON.parse(String(form.get("target") ?? "{}"));
  } catch {
    rawTarget = null;
  }
  const target = targetSchema.safeParse(rawTarget);
  if (!target.success) return NextResponse.json({ error: "badTarget" }, { status: 400 });
  const denied = await denyTarget(ctx, target.data);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  const ref = await putObject(storageKey(ctx.organization.id, ext), Buffer.from(await file.arrayBuffer()));
  const att = await createAttachment(ctx, target.data, {
    ref,
    filename: file.name.slice(0, 200) || `upload.${ext}`,
    mimeType: file.type,
    size: file.size,
  });
  return NextResponse.json({ id: att.id, url: fileUrl(att.id), filename: att.filename, mimeType: att.mimeType });
}
