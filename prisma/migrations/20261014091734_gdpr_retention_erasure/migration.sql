-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "retention" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "erasedAt" TIMESTAMP(3);
