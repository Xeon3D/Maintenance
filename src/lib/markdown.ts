// A small Markdown subset for knowledge-base articles, parsed into blocks that <Markdown> renders as React
// elements (never raw HTML, so article text can't inject markup or script). Pure, so it is unit-tested and
// also runs in the offline field app.
//
//   # / ## / ###     headings
//   - item, * item   bulleted list        1. item   numbered list
//   > text           note / callout       ---       divider
//   ```              code block (fenced; for configs, IPs, commands)
//   inline: **bold**, *italic*, `code`, [text](https://… | mailto:… | tel:… | /path), bare https:// links

export type MdInline =
  | { type: "text" | "bold" | "italic" | "code"; text: string }
  | { type: "link"; text: string; href: string };

export type MdBlock =
  | { type: "h"; level: 2 | 3 | 4; content: MdInline[] }
  | { type: "p" | "quote"; content: MdInline[] }
  | { type: "ul" | "ol"; items: MdInline[][] }
  | { type: "code"; text: string }
  | { type: "hr" };

/** Links may only go to the web, e-mail, phone, or a page of the app; anything else (javascript:, data:…) stays text. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  return null;
}

// No lookbehind: older iPhone Safari (field app) can't parse it. Only *stars* make italics, so snake_case
// names (KNX_IP_router) stay as written; "2 * 3 * 4" doesn't either (a space follows the opening star).
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/gu;

export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  const push = (part: MdInline) => {
    const last = out[out.length - 1];
    if (part.type === "text" && last?.type === "text") last.text += part.text;
    else if (part.text) out.push(part);
  };
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) push({ type: "text", text: text.slice(last, m.index) });
    const [whole, code, linkText, linkHref, bold, italic, url] = m;
    if (code !== undefined) push({ type: "code", text: code });
    else if (linkText !== undefined) {
      const href = safeHref(linkHref);
      push(href ? { type: "link", text: linkText, href } : { type: "text", text: whole });
    } else if (bold !== undefined) push({ type: "bold", text: bold });
    else if (italic !== undefined) push({ type: "italic", text: italic });
    else if (url !== undefined) push({ type: "link", text: url, href: url });
    last = m.index + whole.length;
  }
  if (last < text.length) push({ type: "text", text: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (para.length) blocks.push({ type: "p", content: parseInline(para.join(" ")) });
    if (quote.length) blocks.push({ type: "quote", content: parseInline(quote.join(" ")) });
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) });
    para = [];
    quote = [];
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
    } else if (!line) {
      flush();
    } else if ((m = line.match(/^(#{1,3})\s+(.+)$/))) {
      flush();
      blocks.push({ type: "h", level: (m[1].length + 1) as 2 | 3 | 4, content: parseInline(m[2]) });
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      blocks.push({ type: "hr" });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else if ((m = line.match(/^([-*]|\d+[.)])\s+(.+)$/))) {
      const type = /\d/.test(m[1]) ? "ol" : "ul";
      if (para.length || quote.length || (list && list.type !== type)) flush();
      list ??= { type, items: [] };
      list.items.push(m[2]);
    } else if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += " " + line; // continuation of the previous item
    } else {
      if (list || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

const inlineText = (content: MdInline[]) => content.map((c) => c.text).join("");

/** The article as plain text (no markers): for search snippets and previews. */
export function markdownToText(source: string): string {
  return parseMarkdown(source)
    .map((b) => {
      switch (b.type) {
        case "h":
        case "p":
        case "quote":
          return inlineText(b.content);
        case "ul":
        case "ol":
          return b.items.map(inlineText).join(" · ");
        case "code":
          return b.text;
        case "hr":
          return "";
      }
    })
    .filter(Boolean)
    .join(" · ");
}
