-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "purchaseCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Until now one price did both jobs: start the purchase cost from it (the sale price stays as it is).
UPDATE "Part" SET "purchaseCost" = "unitCost";
