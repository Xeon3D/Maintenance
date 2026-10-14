-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "urgentFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "urgentPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServiceContract" ADD COLUMN     "urgentFee" DECIMAL(12,2),
ADD COLUMN     "urgentPercent" INTEGER;
