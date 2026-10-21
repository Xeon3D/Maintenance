"use client";

import { useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Password input with an eye button that shows what was typed until clicked again. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        title={visible ? t("hidePassword") : t("showPassword")}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
