import { Paperclip, Play } from "lucide-react";
import { isVideo, posterUrl } from "@/lib/video-rules";

/** Square preview of an attachment: the photo, a video's still with a play mark, or a file icon with its name. */
export function AttachmentThumb({ url, filename, mimeType, className = "aspect-square w-full" }: { url: string; filename: string; mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/") || isVideo(mimeType)) {
    return (
      <span className={`relative block overflow-hidden rounded-md border border-border bg-gray-900 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={isVideo(mimeType) ? posterUrl(url) : url} alt={filename} className="size-full object-cover" />
        {isVideo(mimeType) && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/55 p-2 text-white">
              <Play className="size-4 fill-current" />
            </span>
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={`flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-gray-50 p-1 text-center text-[10px] text-muted ${className}`}>
      <Paperclip className="size-4" />
      <span className="line-clamp-2 break-all">{filename}</span>
    </span>
  );
}
