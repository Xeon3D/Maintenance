import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import pt from "../messages/pt.json";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("en and pt have the same keys", () => {
    const e = new Set(keys(en));
    const p = new Set(keys(pt));
    expect([...e].filter((k) => !p.has(k)), "missing in pt").toEqual([]);
    expect([...p].filter((k) => !e.has(k)), "missing in en").toEqual([]);
  });
});

// Every message must parse as ICU, with no <tags>: the app never uses t.rich(), so a literal "<…>" (e.g. an
// example address "Company <a@b.pt>") makes next-intl show the key instead of the text. Escape it as '<'…'>'.
describe("message syntax", () => {
  const entries = (obj: object, prefix = ""): [string, string][] =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? entries(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)] as [string, string]]));
  const hasTag = (els: MessageFormatElement[]): boolean =>
    els.some((e) => e.type === TYPE.tag || ("options" in e && Object.values(e.options).some((o) => hasTag(o.value))));

  for (const [locale, messages] of [["en", en], ["pt", pt]] as const) {
    it(`${locale}: every message parses and has no tags`, () => {
      const bad: string[] = [];
      for (const [key, text] of entries(messages)) {
        try {
          if (hasTag(parse(text))) bad.push(`${key}: tag`);
        } catch (e) {
          bad.push(`${key}: ${(e as Error).message}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
