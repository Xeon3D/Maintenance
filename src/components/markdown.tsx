import { parseMarkdown, type MdInline } from "@/lib/markdown";
import { cn } from "@/lib/utils";

// Renders knowledge-base Markdown (lib/markdown.ts) as React elements, never raw HTML. No hooks, so it works
// in server components, client components and the offline field app alike.

function Inline({ content }: { content: MdInline[] }) {
  return content.map((c, i) => {
    switch (c.type) {
      case "bold":
        return (
          <strong key={i} className="font-semibold">
            {c.text}
          </strong>
        );
      case "italic":
        return <em key={i}>{c.text}</em>;
      case "code":
        return (
          <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em]">
            {c.text}
          </code>
        );
      case "link": {
        const external = !c.href.startsWith("/");
        return (
          <a key={i} href={c.href} className="break-words font-medium text-brand hover:underline" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
            {c.text}
          </a>
        );
      }
      default:
        return <span key={i}>{c.text}</span>;
    }
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h": {
            const H = `h${b.level}` as "h2" | "h3" | "h4";
            return (
              <H key={i} className={cn("font-semibold", b.level === 2 ? "pt-2 text-base" : "pt-1")}>
                <Inline content={b.content} />
              </H>
            );
          }
          case "p":
            return (
              <p key={i} className="break-words">
                <Inline content={b.content} />
              </p>
            );
          case "quote":
            return (
              <div key={i} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <Inline content={b.content} />
              </div>
            );
          case "ul":
          case "ol": {
            const List = b.type;
            return (
              <List key={i} className={cn("space-y-1 pl-5", b.type === "ul" ? "list-disc" : "list-decimal marker:text-muted")}>
                {b.items.map((item, j) => (
                  <li key={j} className="break-words pl-1">
                    <Inline content={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-md border border-border bg-gray-50 px-3 py-2 font-mono text-xs leading-normal">
                {b.text}
              </pre>
            );
          case "hr":
            return <hr key={i} className="border-border" />;
        }
      })}
    </div>
  );
}
