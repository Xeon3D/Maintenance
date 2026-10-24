-- On call: several people per week, and several on-call recipients per request.

-- A week can now hold several members (one row each).
DROP INDEX "OnCallWeek_organizationId_weekStart_key";
CREATE UNIQUE INDEX "OnCallWeek_organizationId_weekStart_userId_key" ON "OnCallWeek"("organizationId", "weekStart", "userId");
CREATE INDEX "OnCallWeek_organizationId_weekStart_idx" ON "OnCallWeek"("organizationId", "weekStart");

-- Request.onCallUserId → Request.onCallUsers (implicit many-to-many: A = Request, B = User).
CREATE TABLE "_RequestOnCall" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RequestOnCall_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_RequestOnCall_B_index" ON "_RequestOnCall"("B");
ALTER TABLE "_RequestOnCall" ADD CONSTRAINT "_RequestOnCall_A_fkey" FOREIGN KEY ("A") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RequestOnCall" ADD CONSTRAINT "_RequestOnCall_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_RequestOnCall" ("A", "B") SELECT "id", "onCallUserId" FROM "Request" WHERE "onCallUserId" IS NOT NULL;

ALTER TABLE "Request" DROP CONSTRAINT "Request_onCallUserId_fkey";
ALTER TABLE "Request" DROP COLUMN "onCallUserId";
