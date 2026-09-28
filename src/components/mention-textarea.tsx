"use client";

import { useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export type MentionMember = { id: string; name: string };

/** The "@partial" being typed just before the caret, if any. */
function activeQuery(text: string, caret: number) {
  const m = /(^|\s)@([^\s@]{0,30})$/u.exec(text.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null;
}

/**
 * Controlled textarea that suggests people after "@" and inserts "@Full Name ".
 * `onEnter` (chat) fires on Enter without Shift, unless the suggestion list is open.
 */
export function MentionTextarea({
  value,
  onValueChange,
  members,
  onEnter,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
  members: MentionMember[];
  onEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState<{ start: number; query: string } | null>(null);
  const [index, setIndex] = useState(0);

  const needle = q?.query.toLowerCase() ?? "";
  const matches = q
    ? members.filter((m) => m.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(needle)) || m.name.toLowerCase().startsWith(needle)).slice(0, 6)
    : [];
  const open = matches.length > 0;

  const update = (text: string, caret: number) => {
    onValueChange(text);
    setQ(activeQuery(text, caret));
    setIndex(0);
  };

  const pick = (m: MentionMember) => {
    if (!q) return;
    const caret = ref.current?.selectionStart ?? value.length;
    const insert = `@${m.name} `;
    const next = value.slice(0, q.start) + insert + value.slice(caret);
    onValueChange(next);
    setQ(null);
    requestAnimationFrame(() => {
      const pos = q.start + insert.length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(matches[index]);
        return;
      }
      if (e.key === "Escape") {
        setQ(null);
        return;
      }
    }
    if (onEnter && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => update(e.target.value, e.target.selectionStart)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQ(null), 150)}
        className={className}
        {...props}
      />
      {open && (
        <ul role="listbox" className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-md border border-border bg-surface py-1 text-sm shadow-lg">
          {matches.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === index}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
              className={cn("cursor-pointer px-3 py-1.5", i === index ? "bg-brand/10 text-brand" : "hover:bg-gray-50")}
            >
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
