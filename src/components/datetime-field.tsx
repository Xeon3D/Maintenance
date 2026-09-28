"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local input that submits an ISO timestamp (hidden field `name`), interpreting
 * the picked value in the user's browser time zone.
 */
export function DateTimeField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  // Filled after mount: the server doesn't know the browser's time zone, so rendering it there would mismatch.
  const [local, setLocal] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(toLocalInput(defaultValue));
  }, [defaultValue]);
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <Input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
