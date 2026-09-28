import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { FileDown } from "lucide-react";
import { Button, Card, Field, Input, PageHeader, Select, Table } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { ActionForm, FieldError } from "@/components/action-form";
import { ConfirmIconButton } from "@/components/confirm-button";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { PoStatusBadge } from "@/components/badges";
import { getContext } from "@/lib/context";
import { fileUrl } from "@/lib/storage";
import { PO_RECEIVABLE, poActions, poTotals, remainingQty } from "@/lib/inventory-math";
import { cn } from "@/lib/utils";
import { addLineAction, deleteLineAction, deletePoAttachmentAction, receiveAction } from "../actions";
import { PoForm } from "../po-form";
import { AddLowStockButton, PoWorkflow } from "./controls";

export default async function PurchaseOrderPage({ params }: PageProps<"/purchase-orders/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("purchasing.manage")) notFound();
  const t = await getTranslations();
  const format = await getFormatter();

  const po = await ctx.db.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, email: true, phone: true } },
      shipTo: { select: { id: true, name: true } },
      workOrder: { select: { id: true, number: true, title: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      lines: { include: { part: { select: { id: true, name: true, sku: true, unit: true } } }, orderBy: { id: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
      stockMovements: {
        where: { type: "RECEIPT" },
        include: { part: { select: { name: true } }, location: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!po) notFound();

  const draft = po.status === "DRAFT";
  const receivable = PO_RECEIVABLE.includes(po.status);
  const hasReceipts = po.lines.some((l) => Number(l.receivedQuantity) > 0);
  const actions = poActions(po.status, { canApprove: ctx.can("purchasing.approve"), hasReceipts });
  const totals = poTotals(po.lines, po.tax, po.shipping);
  const money = (n: number) => format.number(n, { style: "currency", currency: ctx.organization.currency });
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });
  const dt = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });

  const [parts, locations] = await Promise.all([
    draft
      ? ctx.db.part.findMany({
          where: { archivedAt: null },
          select: { id: true, name: true, sku: true, vendorId: true, unitCost: true },
          orderBy: { name: "asc" },
          take: 1000,
        })
      : [],
    receivable ? ctx.db.stockLocation.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }) : [],
  ]);
  const vendorParts = parts.filter((p) => p.vendorId === po.vendorId);
  const otherParts = parts.filter((p) => p.vendorId !== po.vendorId);
  const partOption = (p: (typeof parts)[number]) => (
    <option key={p.id} value={p.id}>
      {p.name}
      {p.sku ? ` (${p.sku})` : ""} · {money(Number(p.unitCost))}
    </option>
  );
  const openLines = po.lines.filter((l) => remainingQty(l) > 0);

  const details: [string, React.ReactNode][] = [
    [
      t("po.vendor"),
      <span key="v">
        <Link href={`/vendors/${po.vendor.id}`} className="font-medium hover:text-brand">
          {po.vendor.name}
        </Link>
        {po.vendor.email && (
          <a href={`mailto:${po.vendor.email}`} className="block text-xs hover:text-brand">
            {po.vendor.email}
          </a>
        )}
        {po.vendor.phone && <span className="block text-xs text-muted">{po.vendor.phone}</span>}
      </span>,
    ],
    [t("po.shipTo"), po.shipTo?.name],
    [t("po.workOrder"), po.workOrder && <Link href={`/work-orders/${po.workOrder.id}`} className="hover:text-brand">#{po.workOrder.number} · {po.workOrder.title}</Link>],
    [t("po.expectedDate"), po.expectedDate && date(po.expectedDate)],
    [t("po.orderDate"), po.orderDate && date(po.orderDate)],
    [t("wo.createdBy"), `${po.createdBy.name} · ${date(po.createdAt)}`],
    [t("po.approvedBy"), po.approvedBy && po.approvedAt && `${po.approvedBy.name} · ${date(po.approvedAt)}`],
  ];

  return (
    <>
      <BackLink href="/purchase-orders" label={t("nav.purchaseOrders")} />
      <PageHeader
        title={`PO-${po.number} · ${po.vendor.name}`}
        actions={
          <>
            <Link href={`/purchase-orders/${po.id}/pdf`} prefetch={false} target="_blank">
              <Button variant="secondary">
                <FileDown className="size-4" />
                PDF
              </Button>
            </Link>
            <PoWorkflow poId={po.id} actions={actions} canDelete={!hasReceipts && (draft || po.status === "CANCELLED")} />
          </>
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        <PoStatusBadge status={po.status} />
        {po.status === "PENDING_APPROVAL" && !ctx.can("purchasing.approve") && <span className="text-xs text-muted">{t("po.awaitingApproval")}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <h2 className="font-medium">{t("po.lines")}</h2>
              {draft && <AddLowStockButton poId={po.id} />}
            </div>
            {po.lines.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{t("po.noLines")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t("po.item")}</th>
                    <th className="text-right">{t("stock.quantity")}</th>
                    {!draft && <th className="text-right">{t("po.received")}</th>}
                    <th className="text-right">{t("parts.unitCost")}</th>
                    <th className="text-right">{t("po.lineTotal")}</th>
                    {draft && <th />}
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((l) => {
                    const rec = Number(l.receivedQuantity);
                    const full = remainingQty(l) === 0;
                    return (
                      <tr key={l.id}>
                        <td>
                          {l.part ? (
                            <Link href={`/parts/${l.part.id}`} className="hover:text-brand">
                              {l.description}
                            </Link>
                          ) : (
                            l.description
                          )}
                          {l.part?.sku && <div className="font-mono text-xs text-muted">{l.part.sku}</div>}
                          {!l.part && <div className="text-xs text-muted">{t("po.freeText")}</div>}
                        </td>
                        <td className="text-right tabular-nums">
                          {format.number(Number(l.quantity))} <span className="text-xs text-muted">{l.part?.unit}</span>
                        </td>
                        {!draft && (
                          <td className={cn("text-right tabular-nums", full ? "text-green-700" : rec > 0 ? "text-amber-700" : "text-muted")}>
                            {format.number(rec)}
                          </td>
                        )}
                        <td className="text-right tabular-nums">{money(Number(l.unitCost))}</td>
                        <td className="text-right tabular-nums">{money(Number(l.quantity) * Number(l.unitCost))}</td>
                        {draft && (
                          <td className="w-8">
                            <ConfirmIconButton action={deleteLineAction.bind(null, po.id, l.id)} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            <dl className="space-y-1 border-t border-border px-5 py-3 text-sm">
              {(
                [
                  [t("po.subtotal"), totals.subtotal],
                  [t("po.tax"), totals.tax],
                  [t("po.shipping"), totals.shipping],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between text-muted">
                  <dt>{k}</dt>
                  <dd className="tabular-nums">{money(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-semibold">
                <dt>{t("po.total")}</dt>
                <dd className="tabular-nums">{money(totals.total)}</dd>
              </div>
            </dl>
            {draft && (
              <div className="border-t border-border p-4">
                <h3 className="mb-3 text-sm font-medium">{t("po.addLine")}</h3>
                <ActionForm action={addLineAction.bind(null, po.id)} submitLabel={t("common.add")}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("parts.part")}>
                      <Select name="partId" defaultValue="">
                        <option value="">{t("po.freeTextOption")}</option>
                        {vendorParts.length > 0 && <optgroup label={t("po.fromVendor", { vendor: po.vendor.name })}>{vendorParts.map(partOption)}</optgroup>}
                        {otherParts.length > 0 && <optgroup label={t("po.otherParts")}>{otherParts.map(partOption)}</optgroup>}
                      </Select>
                    </Field>
                    <Field label={t("po.item")} hint={t("po.itemHint")}>
                      <Input name="description" />
                      <FieldError name="description" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("stock.quantity")}>
                      <Input name="quantity" type="number" step="any" min={0} required defaultValue={1} />
                      <FieldError name="quantity" />
                    </Field>
                    <Field label={t("parts.unitCost")} hint={t("po.unitCostHint")}>
                      <Input name="unitCost" type="number" step="0.01" min={0} />
                      <FieldError name="unitCost" />
                    </Field>
                  </div>
                </ActionForm>
              </div>
            )}
          </Card>

          {receivable && openLines.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 font-medium">{t("po.receive")}</h2>
              <p className="mb-4 text-xs text-muted">{t("po.receiveHint")}</p>
              {/* Keyed on what's outstanding so the inputs reset to the new remaining quantities after each receipt. */}
              <ActionForm
                key={openLines.map((l) => `${l.id}:${remainingQty(l)}`).join()}
                action={receiveAction.bind(null, po.id)}
                submitLabel={t("po.receive")}
              >
                <ul className="divide-y divide-border rounded-md border border-border">
                  {openLines.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        {l.description}
                        <span className="block text-xs text-muted">
                          {t("po.outstanding", { qty: format.number(remainingQty(l)) })}
                          {!l.part && ` · ${t("po.noStockUpdate")}`}
                        </span>
                      </span>
                      <span className="w-28">
                        <Input
                          name={`qty.${l.id}`}
                          type="number"
                          step="any"
                          min={0}
                          max={remainingQty(l)}
                          defaultValue={remainingQty(l)}
                          aria-label={t("stock.quantity")}
                          className="h-9 text-right"
                        />
                        <FieldError name={`qty.${l.id}`} />
                      </span>
                    </li>
                  ))}
                </ul>
                {openLines.some((l) => l.partId) && (
                  <Field label={t("po.receiveInto")}>
                    <Select name="locationId" defaultValue={po.shipToLocationId ?? locations[0]?.id}>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </ActionForm>
            </Card>
          )}

          {po.stockMovements.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-medium">{t("po.receipts")}</h2>
              <ul className="space-y-2 text-sm">
                {po.stockMovements.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      <span className="font-medium text-green-700 tabular-nums">+{format.number(Number(m.quantity))}</span> {m.part.name} → {m.location.name}
                    </span>
                    <span className="text-xs text-muted">
                      {m.user?.name} · {dt(m.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {po.notes && (
            <Card className="p-5">
              <h2 className="mb-2 font-medium">{t("common.notes")}</h2>
              <p className="whitespace-pre-wrap text-sm">{po.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <dl className="space-y-2.5 text-sm">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
            {draft && (
              <details className="mt-4 rounded-md border border-border p-3 [&_summary]:cursor-pointer">
                <summary className="text-sm font-medium">{t("common.edit")}</summary>
                <div className="mt-3">
                  <PoForm ctx={ctx} po={po} />
                </div>
              </details>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 font-medium">{t("po.documents")}</h2>
            <p className="mb-3 text-xs text-muted">{t("po.documentsHint")}</p>
            <AttachmentsPanel
              target={{ purchaseOrderId: po.id }}
              canEdit
              onDelete={deletePoAttachmentAction.bind(null, po.id)}
              files={po.attachments.map((f) => ({ id: f.id, url: fileUrl(f.id), filename: f.filename, mimeType: f.mimeType }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
