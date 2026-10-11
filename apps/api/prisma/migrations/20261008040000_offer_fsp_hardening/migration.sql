-- Wave C.1: Offer snapshot/expiration + FSP achievement source

DO $$ BEGIN
  ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FspAchievementSource" AS ENUM ('FSP', 'DEMO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FspLinkStatus" AS ENUM ('CONNECTED', 'NOT_FOUND', 'UNAVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "salaryFrom" INTEGER;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "salaryTo" INTEGER;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Backfill snapshot salary from legacy salary
UPDATE "Offer" SET "salaryFrom" = "salary" WHERE "salaryFrom" IS NULL AND "salary" IS NOT NULL;

-- Default expiry for existing PENDING offers without expiresAt (14 days from createdAt)
UPDATE "Offer"
SET "expiresAt" = "createdAt" + INTERVAL '14 days'
WHERE "expiresAt" IS NULL AND "status" = 'PENDING';

CREATE INDEX IF NOT EXISTS "Offer_expiresAt_idx" ON "Offer"("expiresAt");

ALTER TABLE "FspAchievement" ADD COLUMN IF NOT EXISTS "source" "FspAchievementSource" NOT NULL DEFAULT 'DEMO';

UPDATE "FspAchievement" SET "source" = CASE WHEN "isDemo" = false THEN 'FSP'::"FspAchievementSource" ELSE 'DEMO'::"FspAchievementSource" END;

CREATE INDEX IF NOT EXISTS "FspAchievement_source_idx" ON "FspAchievement"("source");
