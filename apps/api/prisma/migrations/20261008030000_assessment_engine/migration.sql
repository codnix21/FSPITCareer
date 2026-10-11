-- Wave C: Assessment Engine

DO $$ BEGIN
  CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssessmentResultStatus" AS ENUM ('PASSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CandidateProfile" ADD COLUMN IF NOT EXISTS "recommendedGrade" "Grade";

CREATE INDEX IF NOT EXISTS "CandidateProfile_recommendedGrade_idx" ON "CandidateProfile"("recommendedGrade");

CREATE TABLE IF NOT EXISTS "Assessment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industryId" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 1800,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "cooldownHours" INTEGER NOT NULL DEFAULT 72,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentBlueprint" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentBlueprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentBlueprintSection" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty",
    "required" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssessmentBlueprintSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctOptionIndexes" INTEGER[],
    "explanation" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentGradeThreshold" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "AssessmentGradeThreshold_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assessmentVersion" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "correctAnswers" INTEGER,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "recommendedGrade" "Grade",
    "selfDeclaredGrade" "Grade",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentAttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AssessmentAttemptQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionIndexes" INTEGER[],
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssessmentResult" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assessmentVersion" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "AssessmentResultStatus" NOT NULL,
    "recommendedGrade" "Grade" NOT NULL,
    "selfDeclaredGrade" "Grade",
    "candidateCategoryId" TEXT,
    "sectionScores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Assessment_specializationId_version_key" ON "Assessment"("specializationId", "version");
CREATE INDEX IF NOT EXISTS "Assessment_status_idx" ON "Assessment"("status");
CREATE INDEX IF NOT EXISTS "Assessment_specializationId_idx" ON "Assessment"("specializationId");
CREATE INDEX IF NOT EXISTS "Assessment_industryId_idx" ON "Assessment"("industryId");

CREATE INDEX IF NOT EXISTS "AssessmentBlueprint_assessmentId_idx" ON "AssessmentBlueprint"("assessmentId");
CREATE INDEX IF NOT EXISTS "AssessmentBlueprintSection_blueprintId_idx" ON "AssessmentBlueprintSection"("blueprintId");
CREATE INDEX IF NOT EXISTS "AssessmentBlueprintSection_skill_idx" ON "AssessmentBlueprintSection"("skill");

CREATE INDEX IF NOT EXISTS "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");
CREATE INDEX IF NOT EXISTS "AssessmentQuestion_skill_idx" ON "AssessmentQuestion"("skill");
CREATE INDEX IF NOT EXISTS "AssessmentQuestion_difficulty_idx" ON "AssessmentQuestion"("difficulty");
CREATE INDEX IF NOT EXISTS "AssessmentQuestion_isActive_idx" ON "AssessmentQuestion"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentGradeThreshold_assessmentId_grade_key" ON "AssessmentGradeThreshold"("assessmentId", "grade");
CREATE INDEX IF NOT EXISTS "AssessmentGradeThreshold_assessmentId_idx" ON "AssessmentGradeThreshold"("assessmentId");

CREATE INDEX IF NOT EXISTS "AssessmentAttempt_candidateId_idx" ON "AssessmentAttempt"("candidateId");
CREATE INDEX IF NOT EXISTS "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");
CREATE INDEX IF NOT EXISTS "AssessmentAttempt_status_idx" ON "AssessmentAttempt"("status");
CREATE INDEX IF NOT EXISTS "AssessmentAttempt_expiresAt_idx" ON "AssessmentAttempt"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentAttemptQuestion_attemptId_questionId_key" ON "AssessmentAttemptQuestion"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "AssessmentAttemptQuestion_attemptId_idx" ON "AssessmentAttemptQuestion"("attemptId");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentAnswer_attemptId_questionId_key" ON "AssessmentAnswer"("attemptId", "questionId");
CREATE INDEX IF NOT EXISTS "AssessmentAnswer_attemptId_idx" ON "AssessmentAnswer"("attemptId");

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentResult_attemptId_key" ON "AssessmentResult"("attemptId");
CREATE INDEX IF NOT EXISTS "AssessmentResult_candidateId_idx" ON "AssessmentResult"("candidateId");
CREATE INDEX IF NOT EXISTS "AssessmentResult_assessmentId_idx" ON "AssessmentResult"("assessmentId");
CREATE INDEX IF NOT EXISTS "AssessmentResult_status_idx" ON "AssessmentResult"("status");

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentBlueprint" ADD CONSTRAINT "AssessmentBlueprint_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentBlueprintSection" ADD CONSTRAINT "AssessmentBlueprintSection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "AssessmentBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentGradeThreshold" ADD CONSTRAINT "AssessmentGradeThreshold_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAttemptQuestion" ADD CONSTRAINT "AssessmentAttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAttemptQuestion" ADD CONSTRAINT "AssessmentAttemptQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
