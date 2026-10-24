"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui";
import { formatDate, parseDate, parseTime } from "@/lib/date-input";
import { cn } from "@/lib/utils";

// Date and time fields that always read DD/MM/YYYY and 24-hour HH:MM (native date/time inputs follow the
// browser's language, so an English browser would show MM/DD/YYYY and AM/PM). They submit the same values
// as the native inputs did — "yyyy-mm-dd" and "HH:MM" — through a hidden field named `name`.

type Common = { name?: string; required?: boolean; className?: string; "aria-label"?: string; id?: string };

/** Marks the visible field invalid for the browser's own form validation (blocks submit, shows a hint). */
const validity = (el: HTMLInputElement | null, message: string) => el?.setCustomValidity(message);

export function DateInput({ name, defaultValue, required, className, onChange, ...aria }: Common & { defaultValue?: string | null; onChange?: (iso: string) => void }) {
  const t = useTranslations("dateInput");
  const [text, setText] = useState(formatDate(defaultValue));
  const picker = useRef<HTMLInputElement>(null);
  const iso = parseDate(text);

  // onChange fires once a date is complete (four-digit year), cleared, picked or tidied on blur — not on
  // every keystroke, where "14/10/20" would briefly read as 2020.
  const update = (value: string, el: HTMLInputElement | null, final = false) => {
    setText(value);
    const parsed = parseDate(value);
    validity(el, parsed === null ? t("badDate") : "");
    if (parsed !== null && (final || parsed === "" || /\d{4}$/.test(value.trim()))) onChange?.(parsed);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        {...aria}
        value={text}
        required={required}
        inputMode="numeric"
        autoComplete="off"
        placeholder={t("datePlaceholder")}
        maxLength={10}
        aria-invalid={iso === null || undefined}
        className="w-full pr-10 tabular-nums"
        onChange={(e) => update(e.target.value, e.target)}
        onBlur={(e) => iso && update(formatDate(iso), e.target, true) /* tidy "1/2/26" into 01/02/2026 */}
      />
      <button
        type="button"
        tabIndex={-1}
        title={t("pick")}
        aria-label={t("pick")}
        onClick={() => {
          const p = picker.current;
          if (!p) return;
          try {
            p.showPicker();
          } catch {
            p.focus();
          }
        }}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-brand"
      >
        <CalendarDays className="size-4" />
      </button>
      {/* Native picker for the calendar popup only; its own text box is never shown. */}
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={iso || ""}
        onChange={(e) => update(formatDate(e.target.value), null, true)}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
      />
      {name && <input type="hidden" name={name} value={iso ?? ""} />}
    </div>
  );
}

export function TimeInput({ name, defaultValue, required, className, onChange, placeholder, ...aria }: Common & { defaultValue?: string | null; onChange?: (hhmm: string) => void; placeholder?: string }) {
  const t = useTranslations("dateInput");
  const [text, setText] = useState(defaultValue ?? "");
  const value = parseTime(text);
  return (
    <>
      <Input
        {...aria}
        value={text}
        required={required}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder ?? t("timePlaceholder")}
        maxLength={5}
        aria-invalid={value === null || undefined}
        className={cn("tabular-nums", className)}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseTime(e.target.value);
          validity(e.target, parsed === null ? t("badTime") : "");
          if (parsed !== null) onChange?.(parsed);
        }}
        onBlur={() => value && setText(value)}
      />
      {name && <input type="hidden" name={name} value={value ?? ""} />}
    </>
  );
}
