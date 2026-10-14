-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessHours" JSONB;

-- AlterTable
ALTER TABLE "ServiceContract" ADD COLUMN     "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pauseOnHold" BOOLEAN NOT NULL DEFAULT false;
