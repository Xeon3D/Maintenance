import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import pt from "../messages/pt.json";

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
