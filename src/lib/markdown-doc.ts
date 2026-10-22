import { parseMarkdown, type MdInline } from "@/lib/markdown";

// Converts between the knowledge-base Markdown subset (lib/markdown.ts) and the document of the visual editor
// (Tiptap/ProseMirror JSON, components/knowledge/rich-editor.tsx). Pure, so the round trip is unit-tested.
// The editor only offers what the subset can hold: headings 2–4, one level of lists, notes made of paragraphs,
// one mark per piece of text (code > link > bold > italic), inline images.

export type DocMark = { type: "bold" | "italic" | "code" } | { type: "link"; attrs: { href: string } };
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
};

function inlineToDoc(content: MdInline[]): DocNode[] {
  return content.flatMap((c): DocNode[] => {
    if (c.type === "image") return [{ type: "image", attrs: { src: c.src, alt: c.text || null } }];
    if (!c.text) return [];
    const marks: DocMark[] | undefined =
      c.type === "text" ? undefined : c.type === "link" ? [{ type: "link", attrs: { href: c.href } }] : [{ type: c.type }];
    return [{ type: "text", text: c.text, ...(marks && { marks }) }];
  });
}

const para = (content: MdInline[]): DocNode => {
  const nodes = inlineToDoc(content);
  return { type: "paragraph", ...(nodes.length && { content: nodes }) };
};

export function markdownToDoc(source: string): DocNode {
  const content = parseMarkdown(source).map((b): DocNode => {
    switch (b.type) {
      case "h":
        return { type: "heading", attrs: { level: b.level }, content: inlineToDoc(b.content) };
      case "p":
        return para(b.content);
      case "quote":
        return { type: "blockquote", content: [para(b.content)] };
      case "ul":
      case "ol":
        return {
          type: b.type === "ul" ? "bulletList" : "orderedList",
          content: b.items.map((item) => ({ type: "listItem", content: [para(item)] })),
        };
      case "code":
        return { type: "codeBlock", ...(b.text && { content: [{ type: "text", text: b.text }] }) };
      case "hr":
        return { type: "horizontalRule" };
    }
  });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

// --- Document → Markdown ---------------------------------------------------------------------------------

/** Backslash before characters that would otherwise become formatting. A lone "*" between spaces stays as is. */
function escapeText(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "*") {
      const lone = (i === 0 || s[i - 1] === " ") && (i === s.length - 1 || s[i + 1] === " ");
      out += lone ? ch : "\\*";
    } else out += "`[]".includes(ch) ? "\\" + ch : ch;
  }
  return out;
}

const escapeUrl = (u: string) => u.trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");

type Run = { key: string; text: string; mark?: DocMark };

/** The one mark the subset keeps for a piece of text. */
function primaryMark(marks: DocMark[] = []): DocMark | undefined {
  for (const type of ["code", "link", "bold", "italic"] as const) {
    const m = marks.find((x) => x.type === type);
    if (m) return m;
  }
}

/** Wraps text in a marker, keeping surrounding spaces outside it (`** a **` wouldn't parse back). */
function wrap(text: string, marker: string): string {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return m[2] ? `${m[1]}${marker}${escapeText(m[2])}${marker}${m[3]}` : text;
}

function inlineToMarkdown(nodes: DocNode[] = []): string {
  // Neighbouring text with the same mark (e.g. a link partly in bold) is joined first.
  const runs: (Run | DocNode)[] = [];
  for (const n of nodes) {
    if (n.type !== "text") {
      runs.push(n);
      continue;
    }
    const mark = primaryMark(n.marks);
    const key = mark ? (mark.type === "link" ? `link:${mark.attrs.href}` : mark.type) : "";
    const prev = runs[runs.length - 1];
    if (prev && "key" in prev && prev.key === key) prev.text += n.text ?? "";
    else runs.push({ key, text: n.text ?? "", mark });
  }
  return runs
    .map((r) => {
      if (!("key" in r)) {
        if (r.type === "image") {
          const alt = String(r.attrs?.alt ?? "").replace(/[\[\]\\]/g, "");
          return `![${alt}](${escapeUrl(String(r.attrs?.src ?? ""))})`;
        }
        return r.type === "hardBreak" ? " " : "";
      }
      const text = r.text.replace(/\n/g, " ");
      const mark = r.mark;
      if (!mark) return escapeText(text);
      switch (mark.type) {
        case "code":
          return text.trim() ? "`" + text.replace(/`/g, "'") + "`" : text;
        case "link": {
          const href = escapeUrl(mark.attrs.href);
          // A bare address stays bare, unless it ends in punctuation the parser would leave out.
          if (text === mark.attrs.href && /^https?:\/\/\S+$/.test(href) && !/[.,;:!?'"]$/.test(href)) return href;
          return `[${escapeText(text)}](${href})`;
        }
        case "bold":
          return wrap(text, "**");
        case "italic":
          return wrap(text, "*");
      }
    })
    .join("");
}

/** A paragraph whose text starts like a heading, list, note, divider or code fence gets a backslash. */
function guardLineStart(line: string): string {
  const numbered = line.match(/^(\d+)([.)]\s)/);
  if (numbered) return `${numbered[1]}\\${line.slice(numbered[1].length)}`;
  if (/^(#{1,3}\s|>|[-*]\s|-{3,}\s*$|_{3,}\s*$|\*{3,}\s*$)/.test(line)) return "\\" + line;
  return line;
}

function blockToMarkdown(node: DocNode): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      const text = inlineToMarkdown(node.content).trim();
      return text ? `${"#".repeat(level - 1)} ${text}` : "";
    }
    case "paragraph":
      return guardLineStart(inlineToMarkdown(node.content).trim());
    case "blockquote":
      return (node.content ?? [])
        .map((p) => inlineToMarkdown(p.content).trim())
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join("\n");
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map((item) => (item.content ?? []).map((p) => inlineToMarkdown(p.content).trim()).filter(Boolean).join(" "))
        .filter(Boolean)
        .map((text, i) => `${node.type === "bulletList" ? "-" : `${i + 1}.`} ${text}`)
        .join("\n");
    case "codeBlock": {
      const code = (node.content ?? []).map((t) => t.text ?? "").join("");
      return "```\n" + code.replace(/^```/gm, "'''") + "\n```";
    }
    case "horizontalRule":
      return "---";
    default:
      return "";
  }
}

export function docToMarkdown(doc: DocNode): string {
  return (doc.content ?? []).map(blockToMarkdown).filter(Boolean).join("\n\n");
}
