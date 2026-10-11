-- AlterTable Skill
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Skill" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Clear bad partial slugs from failed attempt
UPDATE "Skill" SET "slug" = NULL;

-- Deterministic unique slugs
UPDATE "Skill" SET "slug" = CASE "name"
  WHEN 'C#' THEN 'csharp'
  WHEN 'C++' THEN 'cpp'
  WHEN 'CI/CD' THEN 'ci-cd'
  WHEN 'Next.js' THEN 'nextjs'
  WHEN 'Node.js' THEN 'nodejs'
  WHEN 'REST API' THEN 'rest-api'
  WHEN 'Tailwind CSS' THEN 'tailwind-css'
  WHEN 'Yandex Cloud' THEN 'yandex-cloud'
  WHEN 'React Native' THEN 'react-native'
  WHEN 'Scikit-learn' THEN 'scikit-learn'
  ELSE lower(regexp_replace(regexp_replace(replace(replace("name", '+', 'plus'), '#', 'sharp'), '[^a-zA-Z0-9а-яА-ЯёЁ]+', '-', 'g'), '(^-|-$)', '', 'g'))
END
WHERE "slug" IS NULL;

-- Fallback uniqueness if collision remains
UPDATE "Skill" s
SET "slug" = s."slug" || '-' || substr(s."id", 1, 6)
WHERE s."slug" IN (
  SELECT "slug" FROM "Skill" WHERE "slug" IS NOT NULL GROUP BY "slug" HAVING COUNT(*) > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "Skill_slug_key" ON "Skill"("slug");
CREATE INDEX IF NOT EXISTS "Skill_isActive_idx" ON "Skill"("isActive");
CREATE INDEX IF NOT EXISTS "Skill_category_idx" ON "Skill"("category");

CREATE TABLE IF NOT EXISTS "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Россия',
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "City_name_country_key" ON "City"("name", "country");
CREATE INDEX IF NOT EXISTS "City_isActive_idx" ON "City"("isActive");
CREATE INDEX IF NOT EXISTS "City_name_idx" ON "City"("name");
