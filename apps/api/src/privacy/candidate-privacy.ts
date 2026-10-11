/** Mappers: never leak email/phone/password into public/matching/offer views */

type AnyProfile = {
  id: string;
  userId: string;
  roleTitle: string;
  grade: string;
  recommendedGrade?: string | null;
  experienceYears: number;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  workFormat: string;
  about?: string | null;
  city?: string | null;
  isVerified?: boolean;
  onboardingCompleted?: boolean;
  profileStatus?: string;
  industryId?: string | null;
  specializationId?: string | null;
  candidateCategoryId?: string | null;
  fspParticipantId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  industry?: { id: string; name: string; slug: string } | null;
  specialization?: { id: string; name: string; slug: string } | null;
  candidateCategory?: { id: string; name: string; slug: string; grade: string } | null;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    emailVerified?: boolean;
  };
  skills?: Array<{ level: number; skill: { id?: string; name: string } }>;
  experiences?: unknown[];
  educations?: unknown[];
  achievements?: Array<{
    id: string;
    title: string;
    discipline: string;
    place?: number | null;
    year: number;
    status: string;
    isDemo?: boolean;
  }>;
  testAttempts?: Array<{
    id: string;
    score: number;
    maxScore: number;
    completedAt: Date;
    test?: { id: string; title: string };
  }>;
  assessmentResults?: Array<{
    id: string;
    score: number;
    status: string;
    recommendedGrade: string;
    selfDeclaredGrade?: string | null;
    createdAt: Date;
    assessment?: { id: string; name: string } | null;
    sectionScores?: unknown;
  }>;
  challengeAttempts?: Array<{
    id: string;
    score: number | null;
    passed: boolean | null;
    status: string;
    submittedAt?: Date | null;
    challenge?: {
      id: string;
      title: string;
      difficulty: string;
      specialization?: { id: string; name: string } | null;
      skill?: { id: string; name: string } | null;
    } | null;
  }>;
  resumes?: Array<{
    id: string;
    fileName: string;
    filePath?: string;
    status: string;
    createdAt: Date;
    analysis?: unknown;
  }>;
};

export function toPublicUser(user?: AnyProfile['user']) {
  if (!user) return { firstName: '', lastName: '' };
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export function toPublicCandidateProfile(profile: AnyProfile) {
  return {
    id: profile.id,
    userId: profile.userId,
    roleTitle: profile.roleTitle,
    grade: profile.grade,
    recommendedGrade: profile.recommendedGrade ?? null,
    experienceYears: profile.experienceYears,
    salaryFrom: profile.salaryFrom ?? null,
    salaryTo: profile.salaryTo ?? null,
    workFormat: profile.workFormat,
    about: profile.about ?? null,
    city: profile.city ?? null,
    isVerified: profile.isVerified ?? false,
    onboardingCompleted: profile.onboardingCompleted ?? false,
    profileStatus: profile.profileStatus ?? 'DRAFT',
    industryId: profile.industryId ?? null,
    specializationId: profile.specializationId ?? null,
    candidateCategoryId: profile.candidateCategoryId ?? null,
    industry: profile.industry
      ? { id: profile.industry.id, name: profile.industry.name, slug: profile.industry.slug }
      : null,
    specialization: profile.specialization
      ? { id: profile.specialization.id, name: profile.specialization.name, slug: profile.specialization.slug }
      : null,
    candidateCategory: profile.candidateCategory
      ? {
          id: profile.candidateCategory.id,
          name: profile.candidateCategory.name,
          slug: profile.candidateCategory.slug,
          grade: profile.candidateCategory.grade,
        }
      : null,
    fspParticipantId: profile.fspParticipantId ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    user: toPublicUser(profile.user),
    skills: (profile.skills || []).map((s) => ({
      level: s.level,
      skill: { id: s.skill.id, name: s.skill.name },
    })),
    experiences: profile.experiences || [],
    educations: profile.educations || [],
    achievements: (profile.achievements || []).map((a) => {
      const isDemo = a.isDemo !== false;
      return {
        id: a.id,
        title: a.title,
        discipline: a.discipline,
        place: a.place ?? null,
        year: a.year,
        status: a.status,
        isDemo,
        sourceType: isDemo ? 'DEMO' : 'FSP',
      };
    }),
    testAttempts: (profile.testAttempts || []).map((t) => ({
      id: t.id,
      score: t.score,
      maxScore: t.maxScore,
      completedAt: t.completedAt,
      test: t.test ? { id: t.test.id, title: t.test.title } : undefined,
    })),
    // Public assessment summary — no answers / question bank / anti-cheat
    assessment: (() => {
      const latest = (profile.assessmentResults || [])[0];
      if (!latest) return { status: 'NOT_TAKEN' as const, latest: null };
      return {
        status: latest.status === 'PASSED' ? ('PASSED' as const) : ('FAILED' as const),
        latest: {
          id: latest.id,
          score: latest.score,
          status: latest.status,
          recommendedGrade: latest.recommendedGrade,
          assessmentName: latest.assessment?.name,
          completedAt: latest.createdAt,
        },
      };
    })(),
    // Challenge summary only — no answers / attempt internals / answer keys
    challenges: (() => {
      const submitted = (profile.challengeAttempts || []).filter(
        (a) => a.status === 'SUBMITTED' && a.score != null,
      );
      const passedCount = submitted.filter((a) => a.passed).length;
      const recent = submitted.slice(0, 5).map((a) => ({
        title: a.challenge?.title ?? 'Задание',
        difficulty: a.challenge?.difficulty ?? null,
        specialization: a.challenge?.specialization
          ? { id: a.challenge.specialization.id, name: a.challenge.specialization.name }
          : null,
        skill: a.challenge?.skill
          ? { id: a.challenge.skill.id, name: a.challenge.skill.name }
          : null,
        score: a.score,
        passed: a.passed,
        submittedAt: a.submittedAt ?? null,
      }));
      return {
        passedCount,
        totalSubmitted: submitted.length,
        recent,
      };
    })(),
    // Never expose storage path to employers
    resumes: (profile.resumes || []).map((r) => ({
      id: r.id,
      fileName: r.fileName,
      status: r.status,
      createdAt: r.createdAt,
      hasAnalysis: !!r.analysis,
    })),
  };
}

export function toOwnCandidateProfile(profile: AnyProfile) {
  const pub = toPublicCandidateProfile(profile);
  return {
    ...pub,
    user: {
      ...pub.user,
      email: profile.user?.email,
      phone: profile.user?.phone ?? null,
      emailVerified: profile.user?.emailVerified ?? false,
    },
    resumes: (profile.resumes || []).map((r) => ({
      id: r.id,
      fileName: r.fileName,
      status: r.status,
      createdAt: r.createdAt,
      analysis: r.analysis ?? null,
      // path only for owner — still not a download URL
      filePath: r.filePath,
    })),
  };
}

export function toMatchingCandidateItem(input: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  grade: string;
  experienceYears: number;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  workFormat: string;
  isVerified?: boolean;
  skills: Array<{ name: string; level: number }>;
  achievementsCount: number;
  matchScore: number;
  matchBreakdown: unknown;
  reasons: string[];
}) {
  return {
    id: input.id,
    userId: input.userId,
    firstName: input.firstName,
    lastName: input.lastName,
    roleTitle: input.roleTitle,
    grade: input.grade,
    experienceYears: input.experienceYears,
    salaryFrom: input.salaryFrom ?? null,
    salaryTo: input.salaryTo ?? null,
    workFormat: input.workFormat,
    isVerified: input.isVerified ?? false,
    skills: input.skills,
    achievementsCount: input.achievementsCount,
    matchScore: input.matchScore,
    matchBreakdown: input.matchBreakdown,
    reasons: input.reasons,
  };
}

export function toOfferResponse(
  offer: {
    id: string;
    vacancyId: string;
    companyId: string;
    employerId: string;
    candidateId: string;
    title?: string | null;
    description?: string | null;
    salary?: number | null;
    salaryFrom?: number | null;
    salaryTo?: number | null;
    currency?: string | null;
    workFormat?: string | null;
    message?: string | null;
    status: string;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    vacancy?: unknown;
    company?: unknown;
    employer?: { id: string; firstName: string; lastName: string; email?: string };
    candidate?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string | null;
      candidateProfile?: { id: string } | null;
    };
  },
  viewer: { id: string; role: string },
  opts?: { includeCandidateContact?: boolean; includeEmployerContact?: boolean },
) {
  const includeCandidateContact = !!opts?.includeCandidateContact;
  const includeEmployerContact = !!opts?.includeEmployerContact;

  return {
    id: offer.id,
    vacancyId: offer.vacancyId,
    companyId: offer.companyId,
    employerId: offer.employerId,
    candidateId: offer.candidateId,
    title: offer.title ?? null,
    description: offer.description ?? null,
    salary: offer.salaryFrom ?? offer.salary ?? null,
    salaryFrom: offer.salaryFrom ?? offer.salary ?? null,
    salaryTo: offer.salaryTo ?? null,
    currency: offer.currency ?? 'RUB',
    workFormat: offer.workFormat ?? null,
    message: offer.message ?? null,
    status: offer.status,
    expiresAt: offer.expiresAt ?? null,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    vacancy: offer.vacancy,
    company: offer.company,
    employer: offer.employer
      ? {
          id: offer.employer.id,
          firstName: offer.employer.firstName,
          lastName: offer.employer.lastName,
          ...(includeEmployerContact && offer.employer.email ? { email: offer.employer.email } : {}),
        }
      : undefined,
    candidate: offer.candidate
      ? {
          id: offer.candidate.id,
          firstName: offer.candidate.firstName,
          lastName: offer.candidate.lastName,
          candidateProfile: offer.candidate.candidateProfile ?? null,
          ...(includeCandidateContact
            ? { email: offer.candidate.email, phone: offer.candidate.phone ?? null }
            : {}),
        }
      : undefined,
    contactAvailable: includeCandidateContact || includeEmployerContact,
    viewerRole: viewer.role,
  };
}
