import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { HelpBlock, HelpInline } from "@/lib/help";

// Renders a parsed help article (lib/help.ts). Server component; no raw HTML from the content.

function Inline({ content }: { content: HelpInline[] }) {
  return content.map((c, i) =>
    c.type === "bold" ? (
      <strong key={i} className="font-semibold text-foreground">
        {c.text}
      </strong>
    ) : c.type === "link" ? (
      <Link key={i} href={c.href} className="font-medium text-brand hover:underline">
        {c.text}
      </Link>
    ) : (
      <span key={i}>{c.text}</span>
    ),
  );
}

export function HelpBlocks({ blocks, shotSrc }: { blocks: HelpBlock[]; shotSrc: (name: string) => string }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "p":
        return (
          <p key={i}>
            <Inline content={b.content} />
          </p>
        );
      case "h3":
        return (
          <h3 key={i} className="pt-2 font-semibold text-foreground">
            {b.text}
          </h3>
        );
      case "ul":
      case "ol": {
        const List = b.type;
        return (
          <List key={i} className={b.type === "ul" ? "list-disc space-y-1.5 pl-5" : "list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-muted"}>
            {b.items.map((item, j) => (
              <li key={j} className="pl-1">
                <Inline content={item} />
              </li>
            ))}
          </List>
        );
      }
      case "tip":
        return (
          <div key={i} className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <Inline content={b.content} />
            </p>
          </div>
        );
      case "shot": {
        const src = shotSrc(b.name);
        return (
          <figure key={i} className="space-y-2">
            <a href={src} target="_blank" rel="noopener" className="block overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={b.caption} loading="lazy" className="block h-auto w-full" />
            </a>
            {b.caption && <figcaption className="text-center text-xs text-muted">{b.caption}</figcaption>}
          </figure>
        );
      }
    }
  });
}
