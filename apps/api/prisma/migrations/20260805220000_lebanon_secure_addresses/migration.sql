-- Lebanon addresses: structured region fields + encrypted GPS (no plaintext lat/lng)

ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "governorate" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "settlementId" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "locationEncrypted" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "locationHash" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "locationGeohash" TEXT;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "locationAccuracyM" DOUBLE PRECISION;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "locationCapturedAt" TIMESTAMP(3);
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "hasExactLocation" BOOLEAN NOT NULL DEFAULT false;

-- Lebanon does not use postal codes
ALTER TABLE "Address" ALTER COLUMN "postalCode" DROP NOT NULL;

-- Default country for new rows
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'Lebanon';

-- Drop plaintext coordinates if they exist (migrated apps should encrypt first via script)
ALTER TABLE "Address" DROP COLUMN IF EXISTS "latitude";
ALTER TABLE "Address" DROP COLUMN IF EXISTS "longitude";

CREATE INDEX IF NOT EXISTS "Address_settlementId_idx" ON "Address"("settlementId");
CREATE INDEX IF NOT EXISTS "Address_governorate_district_city_idx" ON "Address"("governorate", "district", "city");
CREATE INDEX IF NOT EXISTS "Address_locationGeohash_idx" ON "Address"("locationGeohash");
CREATE INDEX IF NOT EXISTS "Address_hasExactLocation_idx" ON "Address"("hasExactLocation");
