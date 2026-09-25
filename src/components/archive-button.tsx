"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui";

/** Archive / restore toggle; `action` is a bound server action taking the new archived state. */
export function ArchiveButton({ archived, action }: { archived: boolean; action: (archived: boolean) => Promise<void> }) {
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => (archived || confirm(`${t("archive")}?`)) && start(() => action(!archived))}
    >
      {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
      {archived ? t("restore") : t("archive")}
    </Button>
  );
}
