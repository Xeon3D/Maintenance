-- Time entries say whether the work was on site or remote; on-site work is charged a trip.
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'REMOTE');

ALTER TABLE "TimeEntry" ADD COLUMN "mode" "WorkMode" NOT NULL DEFAULT 'ONSITE';

-- Trip charges set by the company: a fixed fee within the radius, a rate per km (one way) beyond it.
ALTER TABLE "Organization" ADD COLUMN "travelFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "travelRadiusKm" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN "travelKmRate" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Road distance from the company to the villa (one way), which decides the trip charge.
ALTER TABLE "Villa" ADD COLUMN "distanceKm" DOUBLE PRECISION;

-- One trip per technician per day (default), or one per work order per day.
ALTER TABLE "Organization" ADD COLUMN "travelPerTechnician" BOOLEAN NOT NULL DEFAULT true;

-- A contract can include trips (none charged) or set its own fee / rate per km (null = the company's).
ALTER TABLE "ServiceContract" ADD COLUMN "travelIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "travelFee" DECIMAL(12,2),
ADD COLUMN "travelKmRate" DECIMAL(12,2);
