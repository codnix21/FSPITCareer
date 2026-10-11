-- AlterTable
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- AlterTable City
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;

-- Unique indexes (nullable pairs allowed multiple NULLs in Postgres)
CREATE UNIQUE INDEX IF NOT EXISTS "Skill_externalSource_externalId_key"
  ON "Skill"("externalSource", "externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "City_externalSource_externalId_key"
  ON "City"("externalSource", "externalId");
