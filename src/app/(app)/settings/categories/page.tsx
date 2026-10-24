import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { getContext } from "@/lib/context";
import { titled } from "@/lib/metadata";
import { CategoryForm, DeleteCategoryButton } from "./client";

export const generateMetadata = titled("nav.categories");

export default async function CategoriesPage() {
  const ctx = await getContext();
  if (!ctx.can("workOrders.manage")) notFound();
  const t = await getTranslations();
  const categories = await ctx.db.category.findMany({ include: { _count: { select: { workOrders: true } } }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title={t("categories.title")} description={t("categories.description")} />
      <Card className="mb-6 max-w-3xl p-5">
        <h2 className="mb-4 font-medium">{t("categories.new")}</h2>
        <CategoryForm />
      </Card>
      {categories.length === 0 ? (
        <p className="text-sm text-muted">{t("categories.none")}</p>
      ) : (
        <Card className="max-w-3xl divide-y divide-border">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <CategoryForm category={c} />
              </div>
              <span className="w-24 text-right text-xs text-muted">{t("categories.uses", { n: c._count.workOrders })}</span>
              <DeleteCategoryButton id={c.id} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
