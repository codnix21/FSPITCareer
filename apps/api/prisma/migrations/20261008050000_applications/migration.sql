-- Wave D.1: Candidate Applications (self-apply)

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "coverLetter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Application_candidateId_idx" ON "Application"("candidateId");
CREATE INDEX IF NOT EXISTS "Application_vacancyId_idx" ON "Application"("vacancyId");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");
CREATE INDEX IF NOT EXISTS "Application_createdAt_idx" ON "Application"("createdAt");
CREATE INDEX IF NOT EXISTS "Application_candidateId_vacancyId_idx" ON "Application"("candidateId", "vacancyId");

-- Only one active application per candidate+vacancy (allows re-apply after REJECTED/WITHDRAWN)
CREATE UNIQUE INDEX IF NOT EXISTS "Application_active_candidate_vacancy_key"
  ON "Application"("candidateId", "vacancyId")
  WHERE "status" IN ('SUBMITTED', 'REVIEWING');

DO $$ BEGIN
  ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Application" ADD CONSTRAINT "Application_vacancyId_fkey"
    FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
