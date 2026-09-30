-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'EMPLOYER', 'ADMIN');
CREATE TYPE "Grade" AS ENUM ('JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD');
CREATE TYPE "WorkFormat" AS ENUM ('REMOTE', 'OFFICE', 'HYBRID');
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "ResumeStatus" AS ENUM ('UPLOADED', 'ANALYZING', 'ANALYZED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "experienceYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryFrom" INTEGER,
    "salaryTo" INTEGER,
    "workFormat" "WorkFormat" NOT NULL DEFAULT 'REMOTE',
    "about" TEXT,
    "city" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fspParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "experienceFrom" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceTo" DOUBLE PRECISION,
    "salaryFrom" INTEGER,
    "salaryTo" INTEGER,
    "workFormat" "WorkFormat" NOT NULL DEFAULT 'REMOTE',
    "description" TEXT,
    "requirements" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VacancySkill" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "VacancySkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspParticipant" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roles" TEXT[],
    "ranks" TEXT[],
    CONSTRAINT "FspParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspDiscipline" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "FspDiscipline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspParticipantDiscipline" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    CONSTRAINT "FspParticipantDiscipline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspCompetition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "disciplineId" TEXT,
    CONSTRAINT "FspCompetition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspResult" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "place" INTEGER,
    "status" TEXT NOT NULL,
    CONSTRAINT "FspResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FspAchievement" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "place" INTEGER,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FspAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "ResumeStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "roleTitle" TEXT,
    "experienceYears" DOUBLE PRECISION,
    "skills" TEXT[],
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "salary" INTEGER,
    "workFormat" "WorkFormat",
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "answer" INTEGER NOT NULL,
    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");
CREATE INDEX "CandidateProfile_roleTitle_idx" ON "CandidateProfile"("roleTitle");
CREATE INDEX "CandidateProfile_grade_idx" ON "CandidateProfile"("grade");
CREATE INDEX "CandidateProfile_workFormat_idx" ON "CandidateProfile"("workFormat");
CREATE INDEX "CandidateProfile_fspParticipantId_idx" ON "CandidateProfile"("fspParticipantId");
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE UNIQUE INDEX "CandidateSkill_candidateId_skillId_key" ON "CandidateSkill"("candidateId", "skillId");
CREATE INDEX "CandidateSkill_skillId_idx" ON "CandidateSkill"("skillId");
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");
CREATE INDEX "Vacancy_status_idx" ON "Vacancy"("status");
CREATE INDEX "Vacancy_roleTitle_idx" ON "Vacancy"("roleTitle");
CREATE INDEX "Vacancy_grade_idx" ON "Vacancy"("grade");
CREATE INDEX "Vacancy_companyId_idx" ON "Vacancy"("companyId");
CREATE UNIQUE INDEX "VacancySkill_vacancyId_skillId_key" ON "VacancySkill"("vacancyId", "skillId");
CREATE INDEX "VacancySkill_skillId_idx" ON "VacancySkill"("skillId");
CREATE UNIQUE INDEX "FspParticipant_externalId_key" ON "FspParticipant"("externalId");
CREATE UNIQUE INDEX "FspDiscipline_code_key" ON "FspDiscipline"("code");
CREATE UNIQUE INDEX "FspParticipantDiscipline_participantId_disciplineId_key" ON "FspParticipantDiscipline"("participantId", "disciplineId");
CREATE INDEX "FspResult_participantId_idx" ON "FspResult"("participantId");
CREATE INDEX "FspAchievement_candidateId_idx" ON "FspAchievement"("candidateId");
CREATE INDEX "Resume_candidateId_idx" ON "Resume"("candidateId");
CREATE UNIQUE INDEX "ResumeAnalysis_resumeId_key" ON "ResumeAnalysis"("resumeId");
CREATE UNIQUE INDEX "Match_candidateId_vacancyId_key" ON "Match"("candidateId", "vacancyId");
CREATE INDEX "Match_score_idx" ON "Match"("score");
CREATE INDEX "Offer_status_idx" ON "Offer"("status");
CREATE INDEX "Offer_candidateId_idx" ON "Offer"("candidateId");
CREATE INDEX "Offer_employerId_idx" ON "Offer"("employerId");
CREATE INDEX "TestQuestion_testId_idx" ON "TestQuestion"("testId");
CREATE INDEX "TestAttempt_candidateId_idx" ON "TestAttempt"("candidateId");

-- Foreign keys
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VacancySkill" ADD CONSTRAINT "VacancySkill_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VacancySkill" ADD CONSTRAINT "VacancySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FspParticipantDiscipline" ADD CONSTRAINT "FspParticipantDiscipline_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "FspParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FspParticipantDiscipline" ADD CONSTRAINT "FspParticipantDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "FspDiscipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FspCompetition" ADD CONSTRAINT "FspCompetition_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "FspDiscipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FspResult" ADD CONSTRAINT "FspResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "FspParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FspResult" ADD CONSTRAINT "FspResult_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "FspCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FspAchievement" ADD CONSTRAINT "FspAchievement_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
