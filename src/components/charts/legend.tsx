import { cn } from "@/lib/utils";

/** Series key: text stays in ink, the colored mark beside it carries identity (line for lines, rect for bars). */
export function Legend({ items, className }: { items: { name: string; color: string; shape?: "line" | "rect" }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted", className)}>
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <span className={i.shape === "line" ? "h-0.5 w-3.5 rounded" : "size-2.5 rounded-sm"} style={{ backgroundColor: i.color }} aria-hidden />
          {i.name}
        </li>
      ))}
    </ul>
  );
}
