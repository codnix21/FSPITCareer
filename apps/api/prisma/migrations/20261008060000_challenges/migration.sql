-- Wave D.2: Challenges (regular technical tasks, separate from Assessment Engine)

DO $$ BEGIN
  CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "specializationId" TEXT,
    "skillId" TEXT,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "timeLimitSeconds" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "publishedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeQuestion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "correctOptionIndexes" INTEGER[],
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChallengeQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeAttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "ChallengeAttemptQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChallengeAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIndexes" INTEGER[],
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX IF NOT EXISTS "Challenge_specializationId_idx" ON "Challenge"("specializationId");
CREATE INDEX IF NOT EXISTS "Challenge_skillId_idx" ON "Challenge"("skillId");
CREATE INDEX IF NOT EXISTS "Challenge_publishedAt_idx" ON "Challenge"("publishedAt");
CREATE INDEX IF NOT EXISTS "Challenge_difficulty_idx" ON "Challenge"("difficulty");

CREATE INDEX IF NOT EXISTS "ChallengeQuestion_challengeId_idx" ON "ChallengeQuestion"("challengeId");
CREATE INDEX IF NOT EXISTS "ChallengeQuestion_sortOrder_idx" ON "ChallengeQuestion"("sortOrder");

CREATE INDEX IF NOT EXISTS "ChallengeAttempt_candidateId_idx" ON "ChallengeAttempt"("candidateId");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_challengeId_idx" ON "ChallengeAttempt"("challengeId");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_status_idx" ON "ChallengeAttempt"("status");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_expiresAt_idx" ON "ChallengeAttempt"("expiresAt");
CREATE INDEX IF NOT EXISTS "ChallengeAttempt_candidateId_challengeId_idx" ON "ChallengeAttempt"("candidateId", "challengeId");

-- One active IN_PROGRESS attempt per candidate+challenge (concurrency guard)
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAttempt_active_unique"
  ON "ChallengeAttempt"("candidateId", "challengeId")
  WHERE "status" = 'IN_PROGRESS';

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAttemptQuestion_attemptId_questionId_key"
  ON "ChallengeAttemptQuestion"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "ChallengeAttemptQuestion_attemptId_idx" ON "ChallengeAttemptQuestion"("attemptId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAnswer_attemptId_questionId_key"
  ON "ChallengeAnswer"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "ChallengeAnswer_attemptId_idx" ON "ChallengeAnswer"("attemptId");
CREATE INDEX IF NOT EXISTS "ChallengeAnswer_questionId_idx" ON "ChallengeAnswer"("questionId");

DO $$ BEGIN
  ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_specializationId_fkey"
    FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeQuestion" ADD CONSTRAINT "ChallengeQuestion_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAttemptQuestion" ADD CONSTRAINT "ChallengeAttemptQuestion_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "ChallengeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAttemptQuestion" ADD CONSTRAINT "ChallengeAttemptQuestion_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "ChallengeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "ChallengeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "ChallengeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
