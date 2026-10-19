// Text rules for the fuzzy search over work orders (lib/search.ts): how a query is split into terms, how
// text is compared (case- and accent-insensitive, like `unaccent(lower(…))` in Postgres), and how the
// matching part of a long note is cut out and highlighted. Pure, so it is unit-tested.

/** At most this many words of a query are searched (all must appear somewhere in the work order). */
export const MAX_TERMS = 6;
/** Words this long or longer also match with typos (trigram similarity); shorter ones only as text. */
export const FUZZY_MIN = 4;
/** pg_trgm `word_similarity` a word needs to count as a typo of the term (in SQL). */
export const WORD_SIMILARITY = 0.5;
/** `similarity` between two single words that gets them highlighted as a typo of a term. */
const HIGHLIGHT_SIMILARITY = 0.4;

/** Lower case without accents: "Processador Ótico" → "processador otico". Keeps the length per character. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** The words searched for: folded, letters and digits only, 2+ characters, no repeats. */
export function searchTerms(query: string): string[] {
  const words = fold(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => w.length >= 2))].slice(0, MAX_TERMS);
}

/** pg_trgm's trigrams of one word: padded with two spaces in front and one behind. */
function trigrams(word: string): Set<string> {
  const padded = `  ${word} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** Trigram similarity of two words (0–1), as pg_trgm's `similarity()`. */
export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return shared / (ta.size + tb.size - shared || 1);
}

/** Does a folded word match a term: contains it, or (long terms) is close enough to be a typo of it. */
export function wordMatches(word: string, term: string): boolean {
  return word.includes(term) || (term.length >= FUZZY_MIN && similarity(word, term) >= HIGHLIGHT_SIMILARITY);
}

export type Range = [start: number, end: number];

/** Where the terms appear in `text` (indexes into the original string), merged and in order. */
export function matchRanges(text: string, terms: string[]): Range[] {
  // fold() can change a character's length (rare ligatures): map each folded index back to the original.
  let folded = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) at.push(i);
    folded += f;
    i += ch.length;
  }
  at.push(text.length);

  const ranges: Range[] = [];
  for (const term of terms) {
    for (let i = folded.indexOf(term); i >= 0; i = folded.indexOf(term, i + term.length)) ranges.push([at[i], at[i + term.length]]);
  }
  // Typos: whole words close to a term ("procesador" for "processador").
  for (const m of folded.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = m[0];
    if (terms.some((t) => !word.includes(t) && wordMatches(word, t))) ranges.push([at[m.index], at[m.index + word.length]]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/** Which of the terms appear in `text` (by index into `terms`). */
export function termsIn(text: string, terms: string[]): number[] {
  const folded = fold(text);
  const words = folded.match(/[\p{L}\p{N}]+/gu) ?? [];
  return terms.flatMap((t, i) => (folded.includes(t) || words.some((w) => wordMatches(w, t)) ? [i] : []));
}

export type Snippet = { text: string; marks: Range[]; cutStart: boolean; cutEnd: boolean };

/**
 * The part of `text` around its first match, at most `max` characters, cut at spaces, with the matches
 * to highlight (indexes into the returned text). Short texts come back whole.
 */
export function snippet(text: string, terms: string[], max = 240): Snippet {
  const clean = text.replace(/\s+/g, " ").trim();
  const ranges = matchRanges(clean, terms);
  if (clean.length <= max) return { text: clean, marks: ranges, cutStart: false, cutEnd: false };

  const first = ranges[0]?.[0] ?? 0;
  let start = Math.max(0, first - Math.floor(max / 3));
  if (start > 0) {
    const space = clean.indexOf(" ", start);
    start = space >= 0 && space < first ? space + 1 : start;
  }
  let end = Math.min(clean.length, start + max);
  if (end < clean.length) {
    const space = clean.lastIndexOf(" ", end);
    end = space > start ? space : end;
  }
  const marks = ranges.filter(([s, e]) => s >= start && e <= end).map(([s, e]): Range => [s - start, e - start]);
  return { text: clean.slice(start, end), marks, cutStart: start > 0, cutEnd: end < clean.length };
}
