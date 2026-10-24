"use client";

import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Password input with an eye button: the password shows only while the button is held down. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const isHoldKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        aria-label={t("holdToShowPassword")}
        title={t("holdToShowPassword")}
        // Keep the focus (and the caret) in the field while the button is held.
        onPointerDown={(e) => {
          e.preventDefault();
          show();
        }}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onBlur={hide}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (isHoldKey(e)) {
            e.preventDefault();
            show();
          }
        }}
        onKeyUp={(e) => isHoldKey(e) && hide()}
        className="absolute inset-y-0 right-0 flex w-10 touch-none select-none items-center justify-center rounded-r-md text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
    </div>
  );
}
