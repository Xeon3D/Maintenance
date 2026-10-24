-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "onCall" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "onCallUserId" TEXT;

-- CreateTable
CREATE TABLE "OnCallWeek" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnCallWeek_organizationId_weekStart_key" ON "OnCallWeek"("organizationId", "weekStart");

-- AddForeignKey
ALTER TABLE "OnCallWeek" ADD CONSTRAINT "OnCallWeek_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallWeek" ADD CONSTRAINT "OnCallWeek_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_onCallUserId_fkey" FOREIGN KEY ("onCallUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
