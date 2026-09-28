import { useTranslations } from "next-intl";
import type { ContractStatus } from "@/generated/prisma/enums";
import { endOfDay } from "@/lib/sla";
import { cn } from "@/lib/utils";

const TONE: Record<ContractStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  DRAFT: "bg-gray-100 text-gray-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-gray-100 text-gray-500 line-through",
};

/** Contract status; an active contract past its end date is flagged so someone renews or expires it. */
export function ContractStatusBadge({ status, endDate }: { status: ContractStatus; endDate: Date | null }) {
  const t = useTranslations();
  const lapsed = status === "ACTIVE" && endDate && endOfDay(endDate) < new Date();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE[status])}>{t(`contractStatus.${status}`)}</span>
      {lapsed && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">{t("contracts.pastEnd")}</span>}
    </span>
  );
}
