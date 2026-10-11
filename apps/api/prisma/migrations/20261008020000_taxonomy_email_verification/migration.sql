-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'ASSESSMENT_REQUIRED', 'AVAILABLE', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum Grade: add INTERN (appended; ranking handled in code)
ALTER TYPE "Grade" ADD VALUE IF NOT EXISTS 'INTERN';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable Industry
CREATE TABLE IF NOT EXISTS "Industry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Industry_slug_key" ON "Industry"("slug");
CREATE INDEX IF NOT EXISTS "Industry_isActive_idx" ON "Industry"("isActive");

-- CreateTable Specialization
CREATE TABLE IF NOT EXISTS "Specialization" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Specialization_slug_key" ON "Specialization"("slug");
CREATE INDEX IF NOT EXISTS "Specialization_industryId_idx" ON "Specialization"("industryId");
CREATE INDEX IF NOT EXISTS "Specialization_isActive_idx" ON "Specialization"("isActive");

-- CreateTable CandidateCategory
CREATE TABLE IF NOT EXISTS "CandidateCategory" (
    "id" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CandidateCategory_slug_key" ON "CandidateCategory"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateCategory_specializationId_grade_key" ON "CandidateCategory"("specializationId", "grade");
CREATE INDEX IF NOT EXISTS "CandidateCategory_grade_idx" ON "CandidateCategory"("grade");
CREATE INDEX IF NOT EXISTS "CandidateCategory_isActive_idx" ON "CandidateCategory"("isActive");

-- CreateTable EmailVerificationToken
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- Alter CandidateProfile
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "industryId" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "specializationId" TEXT;
ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "candidateCategoryId" TEXT;

CREATE INDEX IF NOT EXISTS "CandidateProfile_profileStatus_idx" ON "CandidateProfile"("profileStatus");
CREATE INDEX IF NOT EXISTS "CandidateProfile_industryId_idx" ON "CandidateProfile"("industryId");
CREATE INDEX IF NOT EXISTS "CandidateProfile_specializationId_idx" ON "CandidateProfile"("specializationId");
CREATE INDEX IF NOT EXISTS "CandidateProfile_candidateCategoryId_idx" ON "CandidateProfile"("candidateCategoryId");

-- Alter Vacancy
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "industryId" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "specializationId" TEXT;
CREATE INDEX IF NOT EXISTS "Vacancy_industryId_idx" ON "Vacancy"("industryId");
CREATE INDEX IF NOT EXISTS "Vacancy_specializationId_idx" ON "Vacancy"("specializationId");

-- FKs
DO $$ BEGIN
  ALTER TABLE "Specialization" ADD CONSTRAINT "Specialization_industryId_fkey"
    FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CandidateCategory" ADD CONSTRAINT "CandidateCategory_specializationId_fkey"
    FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_industryId_fkey"
    FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_specializationId_fkey"
    FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidateCategoryId_fkey"
    FOREIGN KEY ("candidateCategoryId") REFERENCES "CandidateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_industryId_fkey"
    FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_specializationId_fkey"
    FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mark existing users as verified (legacy accounts / seed)
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
