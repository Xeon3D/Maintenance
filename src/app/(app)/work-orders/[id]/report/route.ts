import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getFormatter, getTranslations } from "next-intl/server";
import { getContext } from "@/lib/context";
import { getObject } from "@/lib/storage";
import { ServiceReport, type ReportData } from "./report-pdf";

const MAX_PHOTOS = 12;
const PDF_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

function duration(min: number) {
  const h = Math.floor(min / 60);
  return h ? `${h}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`;
}

export async function GET(_req: Request, { params }: RouteContext<"/work-orders/[id]/report">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) return new Response("Not found", { status: 404 });
  const t = await getTranslations();
  const format = await getFormatter();

  const wo = await ctx.db.workOrder.findUnique({
    where: { id },
    include: {
      villa: { select: { name: true, address: true, city: true, client: { select: { name: true } } } },
      area: { select: { name: true } },
      asset: { select: { name: true, manufacturer: true, model: true, serialNumber: true } },
      assignees: { select: { user: { select: { name: true } } } },
      completedBy: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      timeEntries: { where: { minutes: { not: null } }, include: { user: { select: { name: true } } }, orderBy: { startedAt: "asc" } },
      attachments: { where: { mimeType: { in: [...PDF_IMAGE_TYPES] } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!wo) return new Response("Not found", { status: 404 });

  const dt = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  const load = (attId: string) => {
    const att = wo.attachments.find((a) => a.id === attId);
    return att ? getObject(att.url).catch(() => null) : Promise.resolve(null);
  };

  const answer = (type: string, value: string | null, unit: string | null) => {
    if (!value) return "—";
    // Built-in PDF fonts are WinAnsi-only (no ✓), so use words.
    if (type === "CHECKBOX") return value === "true" ? t("checklist.yes") : "—";
    if (type === "PASS_FAIL") return t(`checklist.pf.${value}` as never);
    if (type === "PHOTO") return t("report.seePhotos");
    const shown = (type === "NUMBER" || type === "METER_READING") && !isNaN(Number(value)) ? format.number(Number(value)) : value;
    return unit ? `${shown} ${unit}` : shown;
  };

  const signatureIds = new Set([wo.signatureUrl, ...wo.items.filter((i) => i.type === "SIGNATURE").map((i) => i.value)]);
  const photoAtts = wo.attachments.filter((a) => !signatureIds.has(a.id)).slice(0, MAX_PHOTOS);

  const asset = wo.asset
    ? [wo.asset.name, [wo.asset.manufacturer, wo.asset.model].filter(Boolean).join(" "), wo.asset.serialNumber && `S/N ${wo.asset.serialNumber}`]
        .filter(Boolean)
        .join(" · ")
    : null;

  const info: [string, string | null | undefined][] = [
    [t("villas.client"), wo.villa?.client.name],
    [t("assets.villa"), wo.villa && [wo.villa.name, wo.villa.city].filter(Boolean).join(", ")],
    [t("assets.area"), wo.area?.name],
    [t("wo.asset"), asset],
    [t("assets.system"), wo.system && t(`systems.${wo.system}`)],
    [t("wo.type"), t(`woType.${wo.type}`)],
    [t("common.status"), t(`woStatus.${wo.status}`)],
    [t("wo.technicians"), wo.assignees.map((a) => a.user.name).join(", ")],
    [t("wo.createdAt"), dt(wo.createdAt)],
    [t("wo.completedAt"), wo.completedAt && dt(wo.completedAt)],
  ];

  const data: ReportData = {
    labels: {
      reportTitle: t("report.title"),
      description: t("wo.descriptionLabel"),
      checklist: t("checklist.title"),
      time: t("time.title"),
      total: t("time.total"),
      photos: t("report.photos"),
      signoff: t("signoff.title"),
    },
    org: ctx.organization.name,
    number: wo.number,
    title: wo.title,
    generatedAt: dt(new Date()),
    info: info.filter((x): x is [string, string] => !!x[1]),
    description: wo.description,
    checklist: await Promise.all(
      wo.items.map(async (i) => ({
        label: i.label,
        heading: i.type === "HEADING",
        answer: answer(i.type, i.value, i.unit),
        note: i.note,
        image: i.type === "SIGNATURE" && i.value ? await load(i.value) : null,
      })),
    ),
    time: wo.timeEntries.map((e) => ({ who: e.user.name, when: format.dateTime(e.startedAt, { dateStyle: "short" }), duration: duration(e.minutes!), note: e.note })),
    totalTime: duration(wo.timeEntries.reduce((s, e) => s + (e.minutes ?? 0), 0)),
    photos: (await Promise.all(photoAtts.map((a) => getObject(a.url).catch(() => null)))).filter((b): b is Buffer => !!b),
    signature:
      wo.signatureUrl && wo.signedByName && wo.signedAt
        ? await load(wo.signatureUrl).then((image) => (image ? { image, name: wo.signedByName!, at: dt(wo.signedAt!) } : null))
        : null,
  };

  const pdf = await renderToBuffer(createElement(ServiceReport, { d: data }) as unknown as ReactElement<DocumentProps>);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="WO-${wo.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
