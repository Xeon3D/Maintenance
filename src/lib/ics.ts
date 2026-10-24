// iCalendar (RFC 5545) for the personal calendar feed: Google Calendar, Outlook and Apple Calendar subscribe to
// a URL and re-read it every few hours. Pure.

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  updated?: Date;
  /** A cancelled event disappears from the subscriber's calendar. */
  cancelled?: boolean;
};

/** 20261015T090000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes text values: backslash, semicolon, comma and line breaks. */
export const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets (UTF-8), continuation lines starting with a space. */
export function fold(line: string) {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (bytes.encode(current + ch).length > limit) {
      out.push(current);
      current = ch;
    } else current += ch;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildCalendar(opts: { name: string; events: IcsEvent[]; now?: Date }) {
  const now = stamp(opts.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Domusly//Work orders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(opts.name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of opts.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${icsText(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.updated) lines.push(`LAST-MODIFIED:${stamp(e.updated)}`);
    if (e.cancelled) lines.push("STATUS:CANCELLED");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A work order's slot: from its start (else its due time) to its due time, or one hour when that's all there is. */
export function eventTimes(wo: { startDate: Date | null; dueDate: Date | null }): { start: Date; end: Date } | null {
  const start = wo.startDate ?? wo.dueDate;
  if (!start) return null;
  const end = wo.dueDate && wo.dueDate > start ? wo.dueDate : new Date(start.getTime() + 3_600_000);
  return { start, end };
}
