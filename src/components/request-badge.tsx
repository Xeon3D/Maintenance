import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/generated/prisma/enums";

const TONE: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-green-50 text-green-700",
  DECLINED: "bg-gray-100 text-gray-600",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations("requestStatus");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", TONE[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </span>
  );
}
