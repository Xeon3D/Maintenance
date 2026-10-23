-- AlterTable
ALTER TABLE "WorkOrderAssignee" ADD COLUMN     "jobRoleId" TEXT,
ADD COLUMN     "role" "Role";

-- AddForeignKey
ALTER TABLE "WorkOrderAssignee" ADD CONSTRAINT "WorkOrderAssignee_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
