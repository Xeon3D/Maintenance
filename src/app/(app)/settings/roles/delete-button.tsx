"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { deleteJobRoleAction } from "./actions";

export function DeleteJobRoleButton({ id, name, members }: { id: string; name: string; members: number }) {
  const t = useTranslations("roles");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="ml-auto text-danger"
      disabled={pending}
      onClick={() => confirm(t("deleteConfirm", { name, count: members })) && start(() => deleteJobRoleAction(id))}
    >
      {t("delete")}
    </Button>
  );
}
