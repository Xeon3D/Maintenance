"use client";

import { useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui";
import { Scanner } from "@/components/scanner";
import type { ScanPurpose } from "@/lib/scan-codes";
import { cn } from "@/lib/utils";

/** A text input with a camera button: fills it from a barcode, or (serial / MAC) from the label's printed text. */
export function ScanField({
  purpose = "any",
  defaultValue,
  className,
  onValue,
  ...props
}: Omit<ComponentProps<"input">, "defaultValue" | "value"> & { purpose?: ScanPurpose; defaultValue?: string | null; onValue?: (v: string) => void }) {
  const t = useTranslations("scan");
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const set = (v: string) => {
    setValue(v);
    onValue?.(v);
  };
  return (
    <div className="relative">
      <Input {...props} value={value} onChange={(e) => set(e.target.value)} className={cn("w-full pr-10", className)} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("scanField")}
        aria-label={t("scanField")}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-brand"
      >
        <ScanLine className="size-4" />
      </button>
      {open && (
        <Scanner
          purpose={purpose}
          onClose={() => setOpen(false)}
          onResult={(text) => {
            setOpen(false);
            set(text);
          }}
        />
      )}
    </div>
  );
}
