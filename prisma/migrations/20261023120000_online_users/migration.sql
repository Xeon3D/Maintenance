-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSignInAt" TIMESTAMP(3);
