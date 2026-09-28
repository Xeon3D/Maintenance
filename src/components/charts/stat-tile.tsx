import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

/** A headline number: label, value (proportional figures), optional context line. */
export function StatTile({ label, value, sub, alert }: { label: string; value: string; sub?: string | null; alert?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold", alert && "text-danger")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}
