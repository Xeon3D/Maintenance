-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "jobRoleId" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "jobRoleId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "roleRates" JSONB;

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "access" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "hourlyRate" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRole_organizationId_idx" ON "JobRole"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_organizationId_name_key" ON "JobRole"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
