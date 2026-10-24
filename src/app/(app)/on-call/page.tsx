import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { OnCallCalendar, OnCallNow } from "@/components/on-call-calendar";
import { getContext } from "@/lib/context";
import { sp } from "@/lib/list";
import { titled } from "@/lib/metadata";

export const generateMetadata = titled("nav.onCall");

// Who is on call each week, read-only for all staff. Changes are made from Settings → Staff → On call.
export default async function OnCallPage({ searchParams }: PageProps<"/on-call">) {
  const ctx = await getContext();
  if (!ctx.can("internal.view")) notFound();
  const t = await getTranslations();

  return (
    <>
      <PageHeader title={t("nav.onCall")} description={t("onCall.viewDescription")} />
      <OnCallNow ctx={ctx} />
      <OnCallCalendar ctx={ctx} month={sp(await searchParams, "month")} base="/on-call" editable={false} />
    </>
  );
}
