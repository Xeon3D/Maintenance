-- AlterTable
ALTER TABLE "Meter" ADD COLUMN     "alertWorkOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PMSchedule" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "alertMeterId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "meterId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_alertMeterId_fkey" FOREIGN KEY ("alertMeterId") REFERENCES "Meter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMSchedule" ADD CONSTRAINT "PMSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
