import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { assetQrUrl, qrSvg } from "@/lib/qr";
import { assetFilter } from "../filter";
import { PrintButton } from "./print-button";

const MAX_LABELS = 500;

export default async function LabelsPage({ searchParams }: PageProps<"/assets/labels">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const params = await searchParams;
  const ids = sp(params, "ids")?.split(",").filter(Boolean);

  const assets = await ctx.db.asset.findMany({
    where: ids ? { id: { in: ids } } : assetFilter(params),
    include: { villa: { select: { name: true, code: true } }, area: { select: { name: true } } },
    orderBy: [{ villa: { name: "asc" } }, { name: "asc" }],
    take: MAX_LABELS,
  });
  const labels = await Promise.all(
    assets.map(async (a) => ({ ...a, svg: await qrSvg(await assetQrUrl(a.qrToken)) })),
  );

  return (
    <>
      <div className="print:hidden">
        <BackLink href="/assets" label={t("nav.assets")} />
        <PageHeader
          title={t("assets.labelsTitle", { count: labels.length })}
          description={t("assets.labelsHint")}
          actions={<PrintButton label={t("assets.print")} />}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
        {labels.map((a) => (
          <div
            key={a.id}
            className="flex break-inside-avoid items-center gap-3 rounded-md border border-gray-300 bg-white p-3 print:rounded-none"
          >
            <div className="w-20 shrink-0 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: a.svg }} />
            <div className="min-w-0 text-xs leading-tight">
              <div className="text-sm font-semibold">{a.name}</div>
              <div className="mt-0.5 text-gray-600">{t(`systems.${a.system}`)}</div>
              <div className="mt-1 text-gray-600">
                {a.villa.code ?? a.villa.name}
                {a.area && ` · ${a.area.name}`}
              </div>
              {a.code && <div className="mt-0.5 font-mono text-gray-600">{a.code}</div>}
              <div className="mt-1 text-[10px] text-gray-500">{t("assets.labelScan")}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
