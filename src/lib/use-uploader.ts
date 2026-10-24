"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UPLOAD_ERRORS, uploadFile, type UploadTarget, type Uploaded } from "@/lib/upload-client";
import { looksLikeVideo, prepareVideo } from "@/lib/video-client";

/**
 * Uploads picked files one by one (videos are converted on the device first) and tracks what is going on.
 * `label` is the busy text for the button; `error` is a translated message for the last failure.
 */
export function useUploader() {
  const t = useTranslations();
  const [converting, setConverting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  async function upload(list: File[], target: UploadTarget): Promise<Uploaded[]> {
    const done: Uploaded[] = [];
    setBusy(true);
    setCode(null);
    for (const picked of list) {
      try {
        let file = picked;
        if (looksLikeVideo(picked)) {
          setConverting(0);
          file = await prepareVideo(picked, (p) => setConverting(Math.round(p * 100)));
          setConverting(null);
        }
        done.push(await uploadFile(file, target));
      } catch (e) {
        setConverting(null);
        const c = e instanceof Error ? e.message : "";
        setCode(UPLOAD_ERRORS.includes(c) ? c : "failed");
      }
    }
    setBusy(false);
    return done;
  }

  return {
    upload,
    busy,
    label: converting !== null ? t("files.converting", { progress: converting }) : t("checklist.uploading"),
    error: code ? t(`files.${code}`) : null,
  };
}
