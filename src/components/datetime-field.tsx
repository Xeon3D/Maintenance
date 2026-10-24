"use client";

import { useEffect, useState } from "react";
import { DateInput, TimeInput } from "@/components/date-input";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant → local "yyyy-mm-dd" and "HH:MM" in the browser's time zone. */
function toLocal(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** A date with the time left blank means 09:00 (shown as the time field's placeholder). */
const DEFAULT_TIME = "09:00";
const toIso = (date: string, time: string) => (date ? new Date(`${date}T${time || DEFAULT_TIME}`).toISOString() : "");

/**
 * Date (DD/MM/YYYY) + time (24-hour) fields that submit one ISO timestamp (hidden field `name`), interpreting
 * the picked value in the user's browser time zone. A blank time means 09:00.
 */
export function DateTimeField({ name, defaultValue, onChange }: { name: string; defaultValue?: string | null; onChange?: (iso: string) => void }) {
  // Filled after mount: the server doesn't know the browser's time zone, so rendering it there would mismatch.
  const [value, setValue] = useState<{ date: string; time: string } | null>(null);
  useEffect(() => {
    const l = toLocal(defaultValue);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(l);
    onChange?.(toIso(l.date, l.time));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the default changes
  }, [defaultValue]);

  const set = (next: { date: string; time: string }) => {
    setValue(next);
    onChange?.(toIso(next.date, next.time));
  };

  if (!value) return <div className="h-10" />;
  return (
    <div className="flex gap-2">
      <DateInput className="min-w-0 flex-1" defaultValue={value.date} onChange={(date) => set({ ...value, date })} />
      <TimeInput className="w-24" defaultValue={value.time} placeholder={DEFAULT_TIME} onChange={(time) => set({ ...value, time })} />
      <input type="hidden" name={name} value={toIso(value.date, value.time)} />
    </div>
  );
}
