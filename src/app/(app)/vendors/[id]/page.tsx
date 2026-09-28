import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Globe, Mail, Pencil, Phone, Plus } from "lucide-react";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { ActionForm, FieldError } from "@/components/action-form";
import { ArchiveButton } from "@/components/archive-button";
import { ConfirmIconButton } from "@/components/confirm-button";
import { LowStockBadge, PoStatusBadge, SystemBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { isLowStock, onHand, poTotals } from "@/lib/inventory-math";
import { addVendorContactAction, deleteVendorContactAction, setVendorArchivedAction } from "../actions";

export default async function VendorPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();

  const vendor = await ctx.db.vendor.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      parts: {
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true, unit: true, minQuantity: true, stock: { select: { quantity: true, minQuantity: true } } },
      },
      assets: {
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        take: 50,
        select: { id: true, name: true, villa: { select: { name: true } } },
      },
    },
  });
  if (!vendor) notFound();
  const canManage = ctx.can("vendors.manage");
  const canPurchase = ctx.can("purchasing.manage");
  const pos = canPurchase
    ? await ctx.db.purchaseOrder.findMany({
        where: { vendorId: id },
        orderBy: { number: "desc" },
        take: 10,
        include: { lines: { select: { quantity: true, unitCost: true } } },
      })
    : [];
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });

  return (
    <>
      <BackLink href="/vendors" label={t("nav.vendors")} />
      <PageHeader
        title={vendor.name}
        description={t(`vendorType.${vendor.type}`)}
        actions={
          canManage && (
            <>
              <ArchiveButton archived={!!vendor.archivedAt} action={setVendorArchivedAction.bind(null, vendor.id)} />
              <Link href={`/vendors/${vendor.id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="size-4" />
                  {t("common.edit")}
                </Button>
              </Link>
            </>
          )
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap gap-1.5">
        {vendor.archivedAt && <Badge>{t("common.archived")}</Badge>}
        {vendor.systems.map((s) => (
          <SystemBadge key={s} system={s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-medium">{t("vendors.partsSupplied")}</h2>
              {ctx.can("inventory.manage") && (
                <Link href={`/parts/new?vendorId=${vendor.id}`}>
                  <Button size="sm" variant="secondary">
                    <Plus className="size-4" />
                    {t("parts.new")}
                  </Button>
                </Link>
              )}
            </div>
            {vendor.parts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{t("vendors.noParts")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {vendor.parts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/parts/${p.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-gray-50">
                      <span>
                        {p.name}
                        {p.sku && <span className="ml-2 font-mono text-xs text-muted">{p.sku}</span>}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        {isLowStock(p) && <LowStockBadge />}
                        {format.number(onHand(p.stock))} {p.unit}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canPurchase && (
            <Card>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h2 className="font-medium">{t("nav.purchaseOrders")}</h2>
                <Link href={`/purchase-orders/new?vendorId=${vendor.id}`}>
                  <Button size="sm" variant="secondary">
                    <Plus className="size-4" />
                    {t("po.new")}
                  </Button>
                </Link>
              </div>
              {pos.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">{t("po.empty")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {pos.map((po) => (
                    <li key={po.id}>
                      <Link href={`/purchase-orders/${po.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-gray-50">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">PO-{po.number}</span>
                          <span className="text-xs text-muted">{format.dateTime(po.createdAt, { dateStyle: "medium" })}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <PoStatusBadge status={po.status} />
                          <span className="tabular-nums">{money(poTotals(po.lines, po.tax, po.shipping).total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {vendor.assets.length > 0 && (
            <Card>
              <h2 className="border-b border-border px-5 py-3 font-medium">{t("vendors.assetsSupplied")}</h2>
              <ul className="divide-y divide-border">
                {vendor.assets.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assets/${a.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-gray-50">
                      {a.name}
                      <span className="text-xs text-muted">{a.villa.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {vendor.notes && (
            <Card className="p-5">
              <h2 className="mb-2 font-medium">{t("common.notes")}</h2>
              <p className="whitespace-pre-wrap text-sm">{vendor.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="space-y-2 p-5 text-sm">
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 hover:text-brand">
                <Mail className="size-4 text-muted" />
                {vendor.email}
              </a>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 hover:text-brand">
                <Phone className="size-4 text-muted" />
                {vendor.phone}
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 break-all hover:text-brand">
                <Globe className="size-4 shrink-0 text-muted" />
                {vendor.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {vendor.taxId && (
              <div>
                <span className="text-muted">{t("clients.taxId")}:</span> {vendor.taxId}
              </div>
            )}
            {vendor.address && <div className="whitespace-pre-wrap text-muted">{vendor.address}</div>}
            {!vendor.email && !vendor.phone && !vendor.website && !vendor.taxId && !vendor.address && <span className="text-muted">—</span>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">{t("clients.contacts")}</h2>
            <ul className="mb-4 space-y-3">
              {vendor.contacts.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {c.role && <div className="text-xs text-muted">{c.role}</div>}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="block text-xs hover:text-brand">
                        {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="block text-xs hover:text-brand">
                        {c.email}
                      </a>
                    )}
                  </div>
                  {canManage && <ConfirmIconButton action={deleteVendorContactAction.bind(null, vendor.id, c.id)} />}
                </li>
              ))}
              {vendor.contacts.length === 0 && <li className="text-sm text-muted">—</li>}
            </ul>
            {canManage && (
              <details className="rounded-md border border-border p-3 [&_summary]:cursor-pointer">
                <summary className="text-sm font-medium">{t("clients.addContact")}</summary>
                <ActionForm action={addVendorContactAction.bind(null, vendor.id)} submitLabel={t("common.add")} className="mt-3">
                  <Field label={t("common.name")}>
                    <Input name="name" required />
                    <FieldError name="name" />
                  </Field>
                  <Field label={t("clients.contactRole")}>
                    <Input name="role" placeholder={t("vendors.contactRolePlaceholder")} />
                  </Field>
                  <Field label={t("common.phone")}>
                    <Input name="phone" type="tel" />
                  </Field>
                  <Field label={t("common.email")}>
                    <Input name="email" type="email" />
                  </Field>
                </ActionForm>
              </details>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
