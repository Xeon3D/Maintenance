import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HELP_CONTENT } from "../src/content/help";
import { HELP_TOPICS, helpHref, helpTopicFor, parseHelp, shotsIn, type HelpBlock, type HelpInline } from "../src/lib/help";
import { LOCALES } from "../src/i18n/config";

describe("parseHelp", () => {
  const a = parseHelp(`# Title

First **paragraph**
continues here.

## Section one

- a [link](/help/x)
- b

1. step
2. step

> a tip

![Caption](shot-a)

### Sub
text`);

  it("reads title, summary and sections", () => {
    expect(a.title).toBe("Title");
    expect(a.summary).toBe("First paragraph continues here.");
    expect(a.sections.map((s) => [s.id, s.title])).toEqual([["section-one", "Section one"]]);
    expect(a.sections[0].blocks.map((b) => b.type)).toEqual(["ul", "ol", "tip", "shot", "h3", "p"]);
    expect(shotsIn(a)).toEqual(["shot-a"]);
  });

  it("parses inline bold and in-app links only", () => {
    const ul = a.sections[0].blocks[0] as Extract<HelpBlock, { type: "ul" | "ol" }>;
    expect(ul.items[0]).toEqual([
      { type: "text", text: "a " },
      { type: "link", text: "link", href: "/help/x" },
    ]);
    const p = parseHelp("# T\n\nsee [x](https://evil.example) now").intro[0] as Extract<HelpBlock, { type: "p" }>;
    expect(p.content).toEqual([{ type: "text", text: "see [x](https://evil.example) now" }]);
  });
});

describe("contextual help", () => {
  it("maps app paths to articles", () => {
    expect(helpTopicFor("/work-orders/abc/edit")?.slug).toBe("work-orders");
    expect(helpTopicFor("/parts/locations")?.slug).toBe("parts");
    expect(helpTopicFor("/settings/roles")?.slug).toBe("roles");
    expect(helpTopicFor("/work-ordersx")).toBeUndefined();
    expect(helpHref("/help/assets")).toBe("/help");
    expect(helpHref("/villas/1")).toBe("/help/villas");
  });
});

describe("help content", () => {
  const slugs = HELP_TOPICS.map((t) => t.slug);
  const links = (blocks: HelpBlock[]): string[] => {
    const inl = (c: HelpInline[]) => c.flatMap((x) => (x.type === "link" ? [x.href] : []));
    return blocks.flatMap((b) => (b.type === "p" || b.type === "tip" ? inl(b.content) : b.type === "ul" || b.type === "ol" ? b.items.flatMap(inl) : []));
  };

  it("has exactly one article per topic", () => {
    expect(Object.keys(HELP_CONTENT).sort()).toEqual([...slugs].sort());
  });

  for (const slug of slugs) {
    describe(slug, () => {
      const mod = HELP_CONTENT[slug];
      const parsed = Object.fromEntries(LOCALES.map((l) => [l, parseHelp(mod.default[l])]));

      it("has a title, summary and sections in every language", () => {
        for (const l of LOCALES) {
          expect(parsed[l].title, l).not.toBe("");
          expect(parsed[l].summary, l).not.toBe("");
          expect(parsed[l].sections.length, l).toBeGreaterThan(0);
        }
      });

      it("has the same structure and screenshots in every language", () => {
        expect(parsed.pt.sections.length).toBe(parsed.en.sections.length);
        expect(shotsIn(parsed.pt)).toEqual(shotsIn(parsed.en));
      });

      it("declares exactly the screenshots it uses, and they exist", () => {
        const used = [...new Set(shotsIn(parsed.en))].sort();
        expect(mod.shots.map((s) => s.name).sort()).toEqual(used);
        for (const l of LOCALES) for (const name of used) expect(existsSync(`public/help-shots/${l}/${name}.png`), `${l}/${name}`).toBe(true);
      });

      it("links only to existing help articles", () => {
        for (const l of LOCALES) {
          const a = parsed[l];
          for (const href of links([...a.intro, ...a.sections.flatMap((s) => s.blocks)])) {
            if (href.startsWith("/help/")) expect(slugs, `${l}: ${href}`).toContain(href.slice(6).split("#")[0]);
          }
        }
      });
    });
  }

  it("uses unique screenshot names", () => {
    const names = Object.values(HELP_CONTENT).flatMap((m) => m.shots.map((s) => s.name));
    expect(names.length).toBe(new Set(names).size);
  });
});
