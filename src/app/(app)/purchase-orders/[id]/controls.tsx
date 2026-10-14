"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ban, Check, CornerUpLeft, PackagePlus, Pencil, Send, ShoppingCart, Trash2, Undo2 } from "lucide-react";
import { FieldError, FieldErrorsProvider } from "@/components/action-form";
import { Button, Input } from "@/components/ui";
import { useActionForm } from "@/lib/use-action-form";
import type { PoAction } from "@/lib/inventory-math";
import { addLowStockLinesAction, deletePoAction, poTransitionAction, updateLineAction } from "../actions";

const ICONS = { submit: Send, approve: Check, reject: CornerUpLeft, order: ShoppingCart, cancel: Ban, reopen: Undo2 };

/** Status workflow buttons; the server re-checks every transition against poActions(). */
export function PoWorkflow({ poId, actions, canDelete }: { poId: string; actions: PoAction[]; canDelete: boolean }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (a: PoAction) => {
    if ((a === "cancel" || a === "reject") && !confirm(t(`po.confirm.${a}`))) return;
    setError(null);
    start(async () => {
      const res = await poTransitionAction(poId, a);
      if (res.error) setError(t.has(res.error as never) ? t(res.error as never) : t("common.somethingWrong"));
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.map((a) => {
          const Icon = ICONS[a];
          const primary = a === "submit" || a === "approve" || a === "order";
          return (
            <Button key={a} variant={primary ? "primary" : "secondary"} disabled={pending} onClick={() => run(a)}>
              <Icon className="size-4" />
              {t(`po.action.${a}`)}
            </Button>
          );
        })}
        {canDelete && (
          <Button
            variant="danger"
            disabled={pending}
            title={t("common.delete")}
            onClick={() => confirm(t("po.deleteConfirm")) && start(() => deletePoAction(poId))}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function AddLowStockButton({ poId }: { poId: string }) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await addLowStockLinesAction(poId);
            setMsg(res.error ? (t.has(res.error as never) ? t(res.error as never) : t("common.somethingWrong")) : t("po.lowStockAdded", { count: res.added ?? 0 }));
          })
        }
      >
        <PackagePlus className="size-4" />
        {t("po.addLowStock")}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

export type DraftLine = { id: string; description: string; quantity: number; unitCost: number; unit: string | null; sku: string | null; partHref: string | null };

/** A draft PO line: read-only cells with a pencil that turns the row into an inline editor. */
export function DraftLineRow({ poId, line, display, remove }: { poId: string; line: DraftLine; display: { quantity: string; unitCost: string; total: string }; remove: React.ReactNode }) {
  const t = useTranslations();
  const [state, submit, pending] = useActionForm(updateLineAction.bind(null, poId, line.id));
  // The editor stays open until a save succeeds: remember which result was current when it opened.
  const [openedAt, setOpenedAt] = useState<{ state: typeof state } | null>(null);
  const editing = !!openedAt && !(state?.ok && state !== openedAt.state);
  const setEditing = (on: boolean) => setOpenedAt(on ? { state } : null);

  if (editing) {
    return (
      <tr>
        <td colSpan={5}>
          <form method="post" onSubmit={submit} className="flex flex-wrap items-start gap-2">
            <FieldErrorsProvider errors={state?.fieldErrors}>
              <div className="min-w-48 flex-1">
                <Input name="description" defaultValue={line.description} required maxLength={300} aria-label={t("po.item")} autoFocus />
                <FieldError name="description" />
              </div>
              <div className="w-28">
                <Input name="quantity" type="number" min="0.001" step="any" defaultValue={line.quantity} required aria-label={t("stock.quantity")} className="text-right" />
                <FieldError name="quantity" />
              </div>
              <div className="w-32">
                <Input name="unitCost" type="number" min="0" step="0.01" defaultValue={line.unitCost} required aria-label={t("parts.unitCost")} className="text-right" />
                <FieldError name="unitCost" />
              </div>
              <Button size="sm" disabled={pending} className="h-9">
                {t("common.save")}
              </Button>
              <Button size="sm" type="button" variant="ghost" className="h-9" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
              {state?.error && state.error !== "validation" && <p className="w-full text-xs text-danger">{t.has(state.error) ? t(state.error) : t("common.somethingWrong")}</p>}
            </FieldErrorsProvider>
          </form>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td>
        {line.partHref ? (
          <Link href={line.partHref} className="hover:text-brand">
            {line.description}
          </Link>
        ) : (
          line.description
        )}
        {line.sku && <div className="font-mono text-xs text-muted">{line.sku}</div>}
        {!line.partHref && <div className="text-xs text-muted">{t("po.freeText")}</div>}
      </td>
      <td className="text-right tabular-nums">
        {display.quantity} <span className="text-xs text-muted">{line.unit}</span>
      </td>
      <td className="text-right tabular-nums">{display.unitCost}</td>
      <td className="text-right tabular-nums">{display.total}</td>
      <td className="w-16 whitespace-nowrap text-right">
        <button type="button" title={t("common.edit")} onClick={() => setEditing(true)} className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-brand">
          <Pencil className="size-4" />
        </button>
        {remove}
      </td>
    </tr>
  );
}
