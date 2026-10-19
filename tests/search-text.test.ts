import { describe, expect, it } from "vitest";
import { fold, matchRanges, searchTerms, similarity, snippet, termsIn } from "@/lib/search-text";

const marked = (text: string, terms: string[]) => matchRanges(text, terms).map(([s, e]) => text.slice(s, e));

describe("search terms", () => {
  it("folds case and accents and splits on anything but letters and digits", () => {
    expect(searchTerms("  Condensação no PROCESSADOR, KNX-IP! ")).toEqual(["condensacao", "no", "processador", "knx", "ip"]);
  });

  it("drops one-letter words and repeats, and keeps at most six", () => {
    expect(searchTerms("a b cabo cabo")).toEqual(["cabo"]);
    expect(searchTerms("um dois tres quatro cinco seis sete")).toHaveLength(6);
    expect(searchTerms("   ")).toEqual([]);
  });

  it("folds like unaccent(lower())", () => {
    expect(fold("Ótico Ção ÉÀ")).toBe("otico cao ea");
  });
});

describe("matching", () => {
  it("finds parts of words, ignoring accents and case", () => {
    expect(marked("Reiniciei o Processador central", ["proc"])).toEqual(["Proc"]);
    expect(marked("Humidade e condensação no quadro", ["condensacao"])).toEqual(["condensação"]);
  });

  it("finds typos of longer words", () => {
    expect(similarity("procesador", "processador")).toBeGreaterThan(0.5);
    expect(marked("Processador KNX com falha", ["procesador"])).toEqual(["Processador"]);
    expect(termsIn("Processador KNX com falha", ["procesador"])).toEqual([0]);
  });

  it("doesn't treat short or unrelated words as typos", () => {
    expect(termsIn("Cabo de rede partido", ["ups"])).toEqual([]);
    expect(termsIn("Câmara exterior sem imagem", ["processador"])).toEqual([]);
  });

  it("merges overlapping matches", () => {
    expect(matchRanges("processador", ["proc", "cessa"])).toEqual([[0, 8]]);
  });

  it("reports which terms a text contains", () => {
    expect(termsIn("Switch PoE reiniciado", ["poe", "router", "switch"])).toEqual([0, 2]);
  });
});

describe("snippets", () => {
  it("returns short text whole, with the marks", () => {
    const s = snippet("Trocado o  processador\n do bastidor", ["processador"]);
    expect(s).toEqual({ text: "Trocado o processador do bastidor", marks: [[10, 21]], cutStart: false, cutEnd: false });
  });

  it("cuts long text around the first match, at spaces", () => {
    const text = `${"palavra ".repeat(60)}o processador avariou ${"outra ".repeat(60)}`;
    const s = snippet(text, ["processador"], 120);
    expect(s.cutStart).toBe(true);
    expect(s.cutEnd).toBe(true);
    expect(s.text.length).toBeLessThanOrEqual(120);
    expect(s.text.startsWith("palavra")).toBe(true);
    expect(s.marks).toHaveLength(1);
    const [a, b] = s.marks[0];
    expect(s.text.slice(a, b)).toBe("processador");
  });
});
