"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

/**
 * datetime-local input that submits an ISO timestamp (hidden field `name`), interpreting
 * the picked value in the user's browser time zone.
 */
export function DateTimeField({
  name,
  defaultValue,
  onChange,
}: {
  name: string;
  defaultValue?: string | null;
  onChange?: (iso: string) => void;
}) {
  // Filled after mount: the server doesn't know the browser's time zone, so rendering it there would mismatch.
  const [local, setLocal] = useState("");
  useEffect(() => {
    const l = toLocalInput(defaultValue);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(l);
    onChange?.(toIso(l));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the default changes
  }, [defaultValue]);

  return (
    <>
      <Input
        type="datetime-local"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange?.(toIso(e.target.value));
        }}
      />
      <input type="hidden" name={name} value={toIso(local)} />
    </>
  );
}
