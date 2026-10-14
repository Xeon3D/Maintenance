"use client";

import { useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { FieldError, FieldErrorsProvider } from "@/components/action-form";
import { Button, Input } from "@/components/ui";
import { useActionForm } from "@/lib/use-action-form";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

/** New category, or inline rename/recolour of an existing one. */
export function CategoryForm({ category }: { category?: { id: string; name: string; color: string } }) {
  const t = useTranslations();
  const [state, action, pending] = useActionForm(saveCategoryAction.bind(null, category?.id ?? null));
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !category) ref.current?.reset();
  }, [state, category]);

  return (
    <FieldErrorsProvider errors={state?.fieldErrors}>
      <form ref={ref} method="post" onSubmit={action} className="flex flex-wrap items-start gap-2">
        <Input name="color" type="color" defaultValue={category?.color ?? "#64748b"} className="h-9 w-12 p-1" aria-label={t("categories.color")} />
        <div className="min-w-40 flex-1">
          <Input name="name" defaultValue={category?.name} required maxLength={40} placeholder={t("categories.placeholder")} aria-label={t("common.name")} />
          <FieldError name="name" />
        </div>
        <Button size="sm" variant={category ? "secondary" : "primary"} disabled={pending} className="h-9">
          {category ? t("common.save") : t("common.create")}
        </Button>
        {state?.ok && category && <span className="self-center text-xs text-green-700">{t("common.saved")}</span>}
      </form>
    </FieldErrorsProvider>
  );
}

export function DeleteCategoryButton({ id }: { id: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={t("common.delete")}
      disabled={pending}
      onClick={() => confirm(t("categories.deleteConfirm")) && start(() => deleteCategoryAction(id))}
      className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-danger"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
