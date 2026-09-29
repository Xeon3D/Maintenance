-- AlterTable
ALTER TABLE "User" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "clientAbsent" BOOLEAN NOT NULL DEFAULT false;
