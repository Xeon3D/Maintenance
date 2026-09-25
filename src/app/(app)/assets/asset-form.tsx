import { getTranslations } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import type { AppContext } from "@/lib/context";
import { saveAssetAction } from "./actions";
import { AssetFields, type AssetDefaults } from "./asset-fields";

/** Loads the reference lists (villas, areas, sibling assets, vendors) and renders the asset form. */
export async function AssetForm({ ctx, asset }: { ctx: AppContext; asset: AssetDefaults }) {
  const t = await getTranslations("common");
  const [villas, areas, assets, vendors] = await Promise.all([
    ctx.db.villa.findMany({
      where: { OR: [{ archivedAt: null }, ...(asset.villaId ? [{ id: asset.villaId }] : [])] },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    ctx.db.area.findMany({ select: { id: true, name: true, villaId: true, parentId: true } }),
    ctx.db.asset.findMany({ where: { archivedAt: null }, select: { id: true, name: true, villaId: true, parentId: true } }),
    ctx.db.vendor.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ActionForm action={saveAssetAction.bind(null, asset.id ?? null)} submitLabel={asset.id ? t("save") : t("create")}>
      <AssetFields asset={asset} villas={villas} areas={areas} assets={assets} vendors={vendors} />
    </ActionForm>
  );
}
