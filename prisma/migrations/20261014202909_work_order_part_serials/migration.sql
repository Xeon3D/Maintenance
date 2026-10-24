-- AlterTable
ALTER TABLE "WorkOrderPart" ADD COLUMN     "serialNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[];
