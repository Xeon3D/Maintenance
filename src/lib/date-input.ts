// Typed dates and times in European order (DD/MM/YYYY, 24-hour HH:MM), whatever the browser's language.
// Native <input type="date|time|datetime-local"> follow the browser's locale (MM/DD/YYYY and AM/PM in an
// English browser), so forms use text fields that parse with these helpers. Pure; unit-tested.

const pad = (n: number) => String(n).padStart(2, "0");

/** "yyyy-mm-dd" for a real calendar date, else null. */
function isoDate(y: number, m: number, d: number) {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d > last ? null : `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Typed date → "yyyy-mm-dd" (null if invalid, "" if blank). Accepts DD/MM/YYYY with / - . or space,
 * DDMMYYYY, two-digit years (20xx) and ISO yyyy-mm-dd (pasted values).
 */
export function parseDate(text: string): string | null {
  const s = text.trim();
  if (!s) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return isoDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2}|\d{4})$/.exec(s) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return isoDate(year, +m[2], +m[1]);
}

/** "yyyy-mm-dd" → "dd/mm/yyyy" ("" when empty or malformed). */
export function formatDate(iso: string | null | undefined) {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Typed time → "HH:MM" on the 24-hour clock (null if invalid, "" if blank). Accepts 14:00, 14.00, 1400, 9:5, 9. */
export function parseTime(text: string): string | null {
  const s = text.trim();
  if (!s) return "";
  const m = /^(\d{1,2})(?:[:.h]?(\d{2}))?$/.exec(s) ?? /^(\d{1,2})[:.h](\d)$/.exec(s);
  if (!m) return null;
  const h = +m[1];
  const min = m[2] === undefined ? 0 : +m[2];
  return h > 23 || min > 59 ? null : `${pad(h)}:${pad(min)}`;
}
