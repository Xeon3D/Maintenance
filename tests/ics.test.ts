import { describe, expect, it } from "vitest";
import { buildCalendar, eventTimes, fold, icsText } from "@/lib/ics";

describe("iCalendar feed", () => {
  it("escapes text and folds long lines at 75 octets", () => {
    expect(icsText("Router; cabinet, rack\nline 2 \\ end")).toBe("Router\\; cabinet\\, rack\\nline 2 \\\\ end");
    const folded = fold(`DESCRIPTION:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").slice(1).every((l) => l.startsWith(" "))).toBe(true);
  });

  it("writes a subscribable calendar with UTC times", () => {
    const ics = buildCalendar({
      name: "Domusly — Rui",
      now: new Date("2026-10-15T10:00:00Z"),
      events: [
        { uid: "wo-1@app", start: new Date("2026-10-20T09:00:00Z"), end: new Date("2026-10-20T11:30:00Z"), summary: "#1 Router, offline", location: "Villa 7", url: "https://app/work-orders/1" },
        { uid: "wo-2@app", start: new Date("2026-10-21T09:00:00Z"), end: new Date("2026-10-21T10:00:00Z"), summary: "#2 Gone", cancelled: true },
      ],
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261020T090000Z\r\nDTEND:20261020T113000Z\r\nSUMMARY:#1 Router\\, offline");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("gives a job its slot: start → due, else one hour", () => {
    const d = (s: string) => new Date(s);
    expect(eventTimes({ startDate: d("2026-10-20T09:00:00Z"), dueDate: d("2026-10-22T17:00:00Z") })).toEqual({ start: d("2026-10-20T09:00:00Z"), end: d("2026-10-22T17:00:00Z") });
    expect(eventTimes({ startDate: null, dueDate: d("2026-10-22T09:00:00Z") })).toEqual({ start: d("2026-10-22T09:00:00Z"), end: d("2026-10-22T10:00:00Z") });
    expect(eventTimes({ startDate: null, dueDate: null })).toBeNull();
  });
});
