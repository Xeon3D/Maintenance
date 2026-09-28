"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { reorderLowStockAction } from "./actions";

/** Drafts one purchase order per preferred vendor for everything low on stock. */
export function ReorderButton({ count }: { count: number }) {
  const t = useTranslations("parts");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        disabled={pending || count === 0}
        onClick={() => confirm(t("reorderConfirm", { count })) && start(async () => setResult((await reorderLowStockAction()) ?? null))}
      >
        <ShoppingCart className="size-4" />
        {t("reorder")}
      </Button>
      {result && (
        <p className="max-w-xs text-right text-xs text-muted">
          {t("reorderResult", { created: result.created })}{" "}
          {result.skipped > 0 && t("reorderSkipped", { skipped: result.skipped })}{" "}
          {result.created > 0 && (
            <Link href="/purchase-orders?status=DRAFT" className="font-medium text-brand">
              {t("reorderView")}
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
