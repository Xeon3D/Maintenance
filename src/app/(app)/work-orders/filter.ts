import { sp } from "@/lib/list";
import { ACTIVE_STATUSES } from "@/lib/work-orders";
import { Priority, SystemType, WorkOrderStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type Params = Record<string, string | string[] | undefined>;

/**
 * Work order `where` from list params.
 * status: "" = active (open/in progress/on hold), "all", or a specific status.
 * assignee: "me", "unassigned" or a user id.
 */
export function woFilter(params: Params, userId: string, opts: { ignoreStatus?: boolean } = {}): Prisma.WorkOrderWhereInput {
  const q = sp(params, "q");
  const status = sp(params, "status");
  const priority = sp(params, "priority");
  const system = sp(params, "system");
  const assignee = sp(params, "assignee");
  const where: Prisma.WorkOrderWhereInput = {};

  if (!opts.ignoreStatus) {
    if (status === "all") {
      // no filter
    } else if (status && status in WorkOrderStatus) where.status = status as WorkOrderStatus;
    else where.status = { in: ACTIVE_STATUSES };
  }
  if (priority && priority in Priority) where.priority = priority as Priority;
  if (system && system in SystemType) where.system = system as SystemType;
  if (sp(params, "villaId")) where.villaId = sp(params, "villaId");
  if (sp(params, "assetId")) where.assetId = sp(params, "assetId");
  if (assignee === "me") where.assignees = { some: { userId } };
  else if (assignee === "unassigned") where.assignees = { none: {} };
  else if (assignee) where.assignees = { some: { userId: assignee } };
  if (sp(params, "overdue") === "1") {
    where.dueDate = { lt: new Date() };
    where.status = { in: ACTIVE_STATUSES };
  }
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
    ];
  }
  return where;
}

/** Stable ordering: overdue/urgent first, then due date, newest last. */
export const WO_ORDER: Prisma.WorkOrderOrderByWithRelationInput[] = [
  { dueDate: { sort: "asc", nulls: "last" } },
  { priority: "desc" },
  { number: "desc" },
];
