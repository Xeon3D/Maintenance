-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ACCOUNTANT';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "reportEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ClientContact" ADD COLUMN     "receivesReports" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "reportRecipients" JSONB;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "reportSentAt" TIMESTAMP(3),
ADD COLUMN     "reportSentTo" TEXT[] DEFAULT ARRAY[]::TEXT[];
