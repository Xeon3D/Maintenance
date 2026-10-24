import "server-only";
import { prisma } from "@/lib/db/client";

// Right of access / portability (GDPR art. 15 and 20): everything stored about one user, across every
// company they belong to, as JSON. Account-level, so it reads by userId with the raw client (the rows
// are the user's own); password hashes, push keys and other people's data are left out.

export async function exportUserData(userId: string) {
  const byUser = { where: { userId } };
  const [user, memberships, timeEntries, comments, messages, notifications, requests, auditLogs, attachments, push, readings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, locale: true, theme: true, notificationPrefs: true, createdAt: true, updatedAt: true },
    }),
    prisma.membership.findMany({
      ...byUser,
      select: { role: true, active: true, createdAt: true, hourlyRate: true, organization: { select: { name: true } }, jobRole: { select: { name: true } }, client: { select: { name: true } } },
    }),
    prisma.timeEntry.findMany({
      ...byUser,
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, endedAt: true, minutes: true, hourlyRate: true, note: true, workOrder: { select: { number: true, title: true } } },
    }),
    prisma.workOrderComment.findMany({ ...byUser, orderBy: { createdAt: "asc" }, select: { body: true, createdAt: true, workOrder: { select: { number: true, title: true } } } }),
    prisma.message.findMany({ ...byUser, orderBy: { createdAt: "asc" }, select: { body: true, createdAt: true, editedAt: true, conversation: { select: { name: true, type: true } } } }),
    prisma.notification.findMany({ ...byUser, orderBy: { createdAt: "asc" }, select: { type: true, title: true, body: true, readAt: true, createdAt: true } }),
    prisma.request.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "asc" },
      select: { number: true, title: true, description: true, priority: true, status: true, requesterName: true, requesterEmail: true, requesterPhone: true, createdAt: true },
    }),
    prisma.auditLog.findMany({ ...byUser, orderBy: { createdAt: "asc" }, select: { action: true, entityType: true, entityId: true, ip: true, createdAt: true } }),
    prisma.attachment.findMany({ where: { uploadedById: userId }, orderBy: { createdAt: "asc" }, select: { filename: true, mimeType: true, size: true, createdAt: true } }),
    prisma.pushSubscription.findMany({ ...byUser, select: { userAgent: true, createdAt: true } }),
    prisma.meterReading.findMany({ ...byUser, orderBy: { createdAt: "asc" }, select: { value: true, createdAt: true, meter: { select: { name: true } } } }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    user,
    memberships,
    timeEntries,
    workOrderComments: comments,
    chatMessages: messages,
    notifications,
    requests,
    auditLog: auditLogs,
    uploadedFiles: attachments,
    pushDevices: push,
    meterReadings: readings,
  };
}
