-- AlterTable
ALTER TABLE "JobRole" ADD COLUMN     "permissions" JSONB;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "rolePermissions" JSONB;
