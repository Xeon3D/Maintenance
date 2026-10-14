"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { resetRolePermissionsAction } from "./actions";

export function ResetPermissionsButton() {
  const t = useTranslations("perms");
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => confirm(t("resetConfirm")) && start(async () => {
          await resetRolePermissionsAction();
          // The matrix's checkboxes keep what was ticked; reload so they show the defaults again.
          window.location.reload();
        })}>
      <RotateCcw className="size-4" />
      {t("reset")}
    </Button>
  );
}
