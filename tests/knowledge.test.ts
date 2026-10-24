import { describe, expect, it } from "vitest";
import { markdownToText, parseInline, parseMarkdown, safeHref } from "../src/lib/markdown";
import { filterArticles, type ArticleLike } from "../src/lib/knowledge";

describe("parseInline", () => {
  it("reads bold, italic, code and links", () => {
    expect(parseInline("Press **Reset** for *five* seconds on `10.0.0.1`, see [manual](https://x.pt/m.pdf).")).toEqual([
      { type: "text", text: "Press " },
      { type: "bold", text: "Reset" },
      { type: "text", text: " for " },
      { type: "italic", text: "five" },
      { type: "text", text: " seconds on " },
      { type: "code", text: "10.0.0.1" },
      { type: "text", text: ", see " },
      { type: "link", text: "manual", href: "https://x.pt/m.pdf" },
      { type: "text", text: "." },
    ]);
  });

  it("links bare URLs without the trailing punctuation", () => {
    expect(parseInline("Portal: https://gw.local/admin.")).toEqual([
      { type: "text", text: "Portal: " },
      { type: "link", text: "https://gw.local/admin", href: "https://gw.local/admin" },
      { type: "text", text: "." },
    ]);
  });

  it("keeps unsafe links, snake_case and arithmetic as text", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ type: "text", text: "[x](javascript:alert(1))" }]);
    expect(parseInline("KNX_IP_router")).toEqual([{ type: "text", text: "KNX_IP_router" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ type: "text", text: "2 * 3 * 4" }]);
    expect(parseInline("`**not bold**`")).toEqual([{ type: "code", text: "**not bold**" }]);
  });

  it("only allows web, mail, phone and in-app links", () => {
    expect(safeHref("https://a.pt")).toBe("https://a.pt");
    expect(safeHref("mailto:a@b.pt")).toBe("mailto:a@b.pt");
    expect(safeHref("tel:+351210000000")).toBe("tel:+351210000000");
    expect(safeHref("/assets/abc")).toBe("/assets/abc");
    expect(safeHref("//evil.com")).toBeNull();
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });
});

describe("parseMarkdown", () => {
  it("reads headings, lists, notes, code blocks and dividers", () => {
    const blocks = parseMarkdown(`# Rack

First line
second line.

- one
  continued
- two

1. step
2) step

> Mind the dog.

\`\`\`
vlan 10
  name **cctv**
\`\`\`

---`);
    expect(blocks.map((b) => b.type)).toEqual(["h", "p", "ul", "ol", "quote", "code", "hr"]);
    expect(blocks[0]).toEqual({ type: "h", level: 2, content: [{ type: "text", text: "Rack" }] });
    expect(blocks[1]).toEqual({ type: "p", content: [{ type: "text", text: "First line second line." }] });
    expect(blocks[2]).toMatchObject({ items: [[{ text: "one continued" }], [{ text: "two" }]] });
    expect(blocks[5]).toEqual({ type: "code", text: "vlan 10\n  name **cctv**" });
  });

  it("closes an unterminated code block at the end", () => {
    expect(parseMarkdown("```\nabc")).toEqual([{ type: "code", text: "abc" }]);
  });

  it("gives plain text without the markers", () => {
    expect(markdownToText("## Wi-Fi\n\nSSID **Casa**, see [notes](/x).\n\n- a\n- b")).toBe("Wi-Fi · SSID Casa, see notes. · a · b");
  });
});

describe("filterArticles", () => {
  const article = (id: string, over: Partial<ArticleLike>): ArticleLike => ({
    id,
    title: id,
    body: "",
    system: null,
    pinned: false,
    updatedAt: "2026-10-01T00:00:00Z",
    assets: [],
    ...over,
  });
  const list = [
    article("old", { updatedAt: "2026-01-01T00:00:00Z", body: "O **router** fica no bastidor da garagem." }),
    article("pinned", { pinned: true, updatedAt: "2025-01-01T00:00:00Z", system: "NETWORK" }),
    article("Router KNX", { system: "AUTOMATION", assets: [{ id: "a1", name: "Gateway IP" }] }),
    article("new", { updatedAt: "2026-10-10T00:00:00Z", body: "Condensação no quadro." }),
  ];
  const ids = (q: Parameters<typeof filterArticles>[1]) => filterArticles(list, q).map((m) => m.article.id);

  it("lists pinned first, then the most recently updated", () => {
    expect(ids({})).toEqual(["pinned", "new", "Router KNX", "old"]);
  });

  it("filters by system and by asset", () => {
    expect(ids({ system: "NETWORK" })).toEqual(["pinned"]);
    expect(ids({ assetId: "a1" })).toEqual(["Router KNX"]);
  });

  it("searches title, text and asset names, ignoring case and accents, title matches first", () => {
    expect(ids({ q: "router" })).toEqual(["Router KNX", "old"]);
    expect(ids({ q: "condensacao" })).toEqual(["new"]);
    expect(ids({ q: "gateway knx" })).toEqual(["Router KNX"]);
    expect(ids({ q: "router garagem" })).toEqual(["old"]);
    expect(ids({ q: "nothing" })).toEqual([]);
  });

  it("tolerates typos in longer words", () => {
    expect(ids({ q: "bastidr" })).toEqual(["old"]);
  });

  it("highlights the title and cuts an excerpt from the text without markers", () => {
    const [m] = filterArticles(list, { q: "router" });
    expect(m.titleMarks).toEqual([[0, 6]]);
    const old = filterArticles(list, { q: "garagem" })[0];
    expect(old.excerpt?.text).toBe("O router fica no bastidor da garagem.");
    expect(old.excerpt?.marks).toEqual([[29, 36]]);
    expect(filterArticles(list, {}).find((x) => x.article.id === "pinned")?.excerpt).toBeNull();
  });
});
