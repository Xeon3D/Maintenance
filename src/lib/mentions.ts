// @mentions in comments and messages. Pure, so it's shared by the server (who to notify) and tests.

export type Mentionable = { id: string; name: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "@" + name, not followed by another letter/digit (so "@Rui" doesn't match "@Ruiz"). */
function mentioned(body: string, name: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])@${escapeRe(name)}(?![\\p{L}\\p{N}_])`, "iu").test(body);
}

/**
 * Ids of the members mentioned in `body`, by full name ("@Rui Ferreira") or first name ("@Rui").
 * A first name shared by two members only counts when written in full.
 */
export function findMentions(body: string, members: Mentionable[]): string[] {
  if (!body.includes("@")) return [];
  const firstCount = new Map<string, number>();
  for (const m of members) {
    const first = m.name.trim().split(/\s+/)[0].toLowerCase();
    firstCount.set(first, (firstCount.get(first) ?? 0) + 1);
  }
  const ids = new Set<string>();
  for (const m of members) {
    const full = m.name.trim();
    const first = full.split(/\s+/)[0];
    if (mentioned(body, full) || (firstCount.get(first.toLowerCase()) === 1 && mentioned(body, first))) ids.add(m.id);
  }
  return [...ids];
}

/** Short one-line preview for notifications. */
export function excerpt(body: string, max = 140) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
