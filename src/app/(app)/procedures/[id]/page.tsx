import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { BackLink } from "@/components/back-link";
import { ArchiveButton } from "@/components/archive-button";
import { getContext } from "@/lib/context";
import { setProcedureArchivedAction } from "../actions";
import { ProcedureEditor } from "../editor";
import { DuplicateButton } from "./duplicate-button";

export default async function ProcedurePage({ params }: PageProps<"/procedures/[id]">) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();
  const p = await ctx.db.procedure.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      pmSchedules: { select: { id: true, title: true, active: true }, orderBy: { title: "asc" } },
    },
  });
  if (!p) notFound();
  const canManage = ctx.can("procedures.manage");

  return (
    <>
      <BackLink href="/procedures" label={t("nav.procedures")} />
      <PageHeader
        title={p.name}
        actions={
          canManage && (
            <>
              <DuplicateButton id={p.id} />
              <ArchiveButton archived={!!p.archivedAt} action={setProcedureArchivedAction.bind(null, p.id)} />
              <Link href={`/preventive/new?procedureId=${p.id}`}>
                <Button>
                  <CalendarClock className="size-4" />
                  {t("procedures.schedule")}
                </Button>
              </Link>
            </>
          )
        }
      />
      {p.archivedAt && <Badge className="mb-4">{t("common.archived")}</Badge>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-6">
          {canManage ? (
            <ProcedureEditor id={p.id} initial={{ name: p.name, description: p.description, system: p.system, items: p.items }} />
          ) : (
            <ol className="space-y-2 text-sm">
              {p.items.map((i) => (
                <li key={i.id} className={i.type === "HEADING" ? "pt-2 font-semibold" : ""}>
                  {i.label}
                  {i.required && <span className="text-danger">*</span>}
                  {i.type !== "HEADING" && <span className="ml-2 text-xs text-muted">{t(`checklist.types.${i.type}`)}</span>}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="h-fit p-5">
          <h2 className="mb-2 font-medium">{t("procedures.usedBySchedules")}</h2>
          {p.pmSchedules.length === 0 ? (
            <p className="text-sm text-muted">{t("procedures.notScheduled")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {p.pmSchedules.map((s) => (
                <li key={s.id}>
                  <Link href={`/preventive/${s.id}`} className={s.active ? "hover:text-brand" : "text-muted line-through"}>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">{t("procedures.editNote")}</p>
        </Card>
      </div>
    </>
  );
}
