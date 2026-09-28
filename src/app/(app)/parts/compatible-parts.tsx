import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, Select } from "@/components/ui";
import { ActionForm, FieldError } from "@/components/action-form";
import { ConfirmIconButton } from "@/components/confirm-button";
import { LowStockBadge } from "@/components/badges";
import type { AppContext } from "@/lib/context";
import { isLowStock, onHand } from "@/lib/inventory-math";
import { linkAssetPartAction, unlinkAssetPartAction } from "./actions";

/** Spare parts that fit an asset (asset page); technicians see them first when logging parts on a WO. */
export async function CompatibleParts({ ctx, assetId }: { ctx: AppContext; assetId: string }) {
  const t = await getTranslations();
  const format = await getFormatter();
  const canEdit = ctx.can("inventory.manage") || ctx.can("assets.manage");

  const [linked, others] = await Promise.all([
    ctx.db.part.findMany({
      where: { archivedAt: null, assets: { some: { id: assetId } } },
      select: { id: true, name: true, sku: true, unit: true, minQuantity: true, stock: { where: { location: { archivedAt: null } }, select: { quantity: true, minQuantity: true } } },
      orderBy: { name: "asc" },
    }),
    canEdit
      ? ctx.db.part.findMany({
          where: { archivedAt: null, assets: { none: { id: assetId } } },
          select: { id: true, name: true, sku: true },
          orderBy: { name: "asc" },
          take: 500,
        })
      : [],
  ]);
  if (!canEdit && linked.length === 0) return null;

  return (
    <Card>
      <h2 className="border-b border-border px-5 py-3 font-medium">{t("parts.compatibleParts")}</h2>
      {linked.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{t("parts.noCompatible")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {linked.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
              <Link href={`/parts/${p.id}`} className="min-w-0 hover:text-brand">
                {p.name}
                {p.sku && <span className="ml-2 font-mono text-xs text-muted">{p.sku}</span>}
              </Link>
              <span className="flex shrink-0 items-center gap-2 tabular-nums">
                {isLowStock(p) && <LowStockBadge />}
                {format.number(onHand(p.stock))} <span className="text-xs text-muted">{p.unit}</span>
                {canEdit && <ConfirmIconButton action={unlinkAssetPartAction.bind(null, assetId, p.id)} />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && others.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <ActionForm action={linkAssetPartAction.bind(null, assetId)} submitLabel={t("common.add")} className="flex flex-wrap items-start gap-2 space-y-0 [&>fieldset]:min-w-48 [&>fieldset]:flex-1">
            <Select name="partId" defaultValue="" aria-label={t("parts.part")}>
              <option value="" disabled>
                {t("parts.pickPart")}
              </option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` (${p.sku})` : ""}
                </option>
              ))}
            </Select>
            <FieldError name="partId" />
          </ActionForm>
        </div>
      )}
    </Card>
  );
}
