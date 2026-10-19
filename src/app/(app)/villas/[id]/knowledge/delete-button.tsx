"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

export function DeleteArticleButton({ action }: { action: () => Promise<void> }) {
  const t = useTranslations("knowledge");
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="danger" disabled={pending} onClick={() => confirm(t("deleteConfirm")) && start(() => action())}>
      <Trash2 className="size-4" />
      {t("delete")}
    </Button>
  );
}
