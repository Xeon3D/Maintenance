import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../src/lib/markdown";
import { docToMarkdown, markdownToDoc, type DocNode } from "../src/lib/markdown-doc";

const text = (t: string, marks?: DocNode["marks"]): DocNode => ({ type: "text", text: t, ...(marks && { marks }) });
const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });

describe("images and escapes in Markdown", () => {
  it("reads images from the app's files and https only", () => {
    expect(parseInline("See ![Rack front](/api/files/abc) here")).toEqual([
      { type: "text", text: "See " },
      { type: "image", text: "Rack front", src: "/api/files/abc" },
      { type: "text", text: " here" },
    ]);
    expect(parseInline("![](https://x.pt/a.png)")).toEqual([{ type: "image", text: "", src: "https://x.pt/a.png" }]);
    expect(parseInline("![x](javascript:alert(1))")[0].type).toBe("text");
    expect(parseInline("![x](http://x.pt/a.png)")[0].type).toBe("text");
  });

  it("keeps escaped markers as text and leaves UNC paths alone", () => {
    expect(parseInline("2\\*3\\*4 and \\[x\\](y)")).toEqual([{ type: "text", text: "2*3*4 and [x](y)" }]);
    expect(parseInline("\\\\nas\\backups")).toEqual([{ type: "text", text: "\\\\nas\\backups" }]);
    expect(parseInline("**a \\* b**")).toEqual([{ type: "bold", text: "a * b" }]);
    expect(parseMarkdown("\\# not a heading\n\n1\\. not a list")).toEqual([
      { type: "p", content: [{ type: "text", text: "# not a heading" }] },
      { type: "p", content: [{ type: "text", text: "1. not a list" }] },
    ]);
  });
});

describe("visual editor document ⇄ Markdown", () => {
  const sample = [
    "# Network",
    "Router at `10.0.0.1`, see [manual](https://x.pt/m.pdf) or https://x.pt/help",
    "## Wi-Fi",
    "- SSID **Casa**\n- Guest *only*",
    "1. Reset\n2. Wait",
    "> Ask the owner first",
    "```\nip a\nping 10.0.0.1\n```",
    "---",
    "Front: ![Rack](/api/files/abc)",
  ].join("\n\n");

  it("round-trips the whole subset", () => {
    expect(docToMarkdown(markdownToDoc(sample))).toBe(sample);
  });

  it("maps headings, notes and images to editor nodes", () => {
    const d = markdownToDoc("# A\n\n> note\n\n![Rack](/api/files/abc)");
    expect(d.content).toEqual([
      { type: "heading", attrs: { level: 2 }, content: [text("A")] },
      { type: "blockquote", content: [p(text("note"))] },
      p({ type: "image", attrs: { src: "/api/files/abc", alt: "Rack" } }),
    ]);
    expect(markdownToDoc("")).toEqual(doc({ type: "paragraph" }));
  });

  it("escapes text that would otherwise turn into formatting", () => {
    const md = docToMarkdown(doc(p(text("# 5*3 [x] `y`")), p(text("1. step")), p(text("- dash")), p(text("2 * 3"))));
    expect(md).toBe("\\# 5\\*3 \\[x\\] \\`y\\`\n\n1\\. step\n\n\\- dash\n\n2 * 3");
    expect(markdownToDoc(md).content?.map((b) => b.content?.[0].text)).toEqual(["# 5*3 [x] `y`", "1. step", "- dash", "2 * 3"]);
  });

  it("keeps spaces outside markers and one mark per piece of text", () => {
    const bold = [{ type: "bold" as const }];
    const link = { type: "link" as const, attrs: { href: "https://x.pt" } };
    expect(docToMarkdown(doc(p(text("Press "), text("Reset "), text("now"))))).toBe("Press Reset now");
    expect(docToMarkdown(doc(p(text("Press "), text("Reset ", bold), text("now"))))).toBe("Press **Reset** now");
    expect(docToMarkdown(doc(p(text("the ", [link]), text("site", [link, { type: "bold" }]))))).toBe("[the site](https://x.pt)");
  });

  it("drops empty blocks and joins list paragraphs", () => {
    expect(docToMarkdown(doc(p(), { type: "heading", attrs: { level: 3 } }, p(text("x"))))).toBe("x");
  });
});
