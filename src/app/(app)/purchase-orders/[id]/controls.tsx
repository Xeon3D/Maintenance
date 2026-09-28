"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, Check, CornerUpLeft, PackagePlus, Send, ShoppingCart, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { PoAction } from "@/lib/inventory-math";
import { addLowStockLinesAction, deletePoAction, poTransitionAction } from "../actions";

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
