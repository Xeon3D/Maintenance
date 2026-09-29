-- AlterTable
ALTER TABLE "Villa" ADD COLUMN     "managerId" TEXT;

-- CreateIndex
CREATE INDEX "Villa_managerId_idx" ON "Villa"("managerId");

-- AddForeignKey
ALTER TABLE "Villa" ADD CONSTRAINT "Villa_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
