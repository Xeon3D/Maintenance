"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui";
import { duplicateProcedureAction } from "../actions";

export function DuplicateButton({ id }: { id: string }) {
  const t = useTranslations("procedures");
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(() => duplicateProcedureAction(id))}>
      <Copy className="size-4" />
      {t("duplicate")}
    </Button>
  );
}
