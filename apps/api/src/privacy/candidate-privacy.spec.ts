import { toMatchingCandidateItem, toOfferResponse, toOwnCandidateProfile, toPublicCandidateProfile } from './candidate-privacy';

describe('candidate privacy mappers', () => {
  const profile = {
    id: 'p1',
    userId: 'u1',
    roleTitle: 'Backend Developer',
    grade: 'MIDDLE',
    experienceYears: 3,
    salaryFrom: 200000,
    salaryTo: 300000,
    workFormat: 'REMOTE',
    about: 'about',
    city: 'Москва',
    isVerified: true,
    onboardingCompleted: true,
    fspParticipantId: 'fsp1',
    user: { id: 'u1', firstName: 'Иван', lastName: 'Петров', email: 'secret@example.ru', phone: '+7999' },
    skills: [{ level: 4, skill: { id: 's1', name: 'Python' } }],
    experiences: [],
    educations: [],
    achievements: [{ id: 'a1', title: 'Cup', discipline: 'Algo', place: 1, year: 2024, status: 'FINALIST', isDemo: true }],
    testAttempts: [{ id: 't1', score: 80, maxScore: 100, completedAt: new Date(), test: { id: 'test1', title: 'Backend' } }],
    assessmentResults: [
      {
        id: 'ar1',
        score: 82,
        status: 'PASSED',
        recommendedGrade: 'MIDDLE',
        createdAt: new Date(),
        assessment: { id: 'ass1', name: 'Backend' },
      },
    ],
    recommendedGrade: 'MIDDLE',
    resumes: [{ id: 'r1', fileName: 'cv.pdf', filePath: '/secret/path', status: 'ANALYZED', createdAt: new Date(), analysis: { roleTitle: 'Backend' } }],
  };

  it('public profile strips email/phone/filePath', () => {
    const pub = toPublicCandidateProfile(profile as any);
    expect((pub.user as any).email).toBeUndefined();
    expect((pub.user as any).phone).toBeUndefined();
    expect(JSON.stringify(pub)).not.toContain('secret@example.ru');
    expect(JSON.stringify(pub)).not.toContain('/secret/path');
    expect(pub.achievements[0].sourceType).toBe('DEMO');
    expect(pub.assessment.status).toBe('PASSED');
    expect(pub.assessment.latest?.score).toBe(82);
    expect(JSON.stringify(pub.assessment)).not.toContain('correctAnswer');
    expect(pub.challenges.passedCount).toBe(0);
    expect(pub.challenges.recent).toEqual([]);
  });

  it('employer challenge summary hides answers and attempt internals', () => {
    const withChallenges = {
      ...profile,
      challengeAttempts: [
        {
          id: 'ca1',
          score: 90,
          passed: true,
          status: 'SUBMITTED',
          submittedAt: new Date('2026-10-01'),
          challenge: {
            id: 'ch1',
            title: 'Backend HTTP',
            difficulty: 'EASY',
            specialization: { id: 'sp1', name: 'Backend' },
            skill: { id: 'sk1', name: 'REST API' },
          },
          answers: [{ selectedOptionIndexes: [0], correctOptionIndexes: [0] }],
        },
      ],
    };
    const pub = toPublicCandidateProfile(withChallenges as any);
    expect(pub.challenges.passedCount).toBe(1);
    expect(pub.challenges.recent[0].score).toBe(90);
    expect(pub.challenges.recent[0].title).toBe('Backend HTTP');
    expect(JSON.stringify(pub.challenges)).not.toContain('correctOptionIndexes');
    expect(JSON.stringify(pub.challenges)).not.toContain('selectedOptionIndexes');
    expect(JSON.stringify(pub.challenges)).not.toContain('ca1');
  });

  it('own profile keeps email for owner', () => {
    const own = toOwnCandidateProfile(profile as any);
    expect(own.user.email).toBe('secret@example.ru');
    expect(own.user.phone).toBe('+7999');
  });

  it('matching item has no email', () => {
    const item = toMatchingCandidateItem({
      id: 'p1',
      userId: 'u1',
      firstName: 'Иван',
      lastName: 'Петров',
      roleTitle: 'Backend',
      grade: 'MIDDLE',
      experienceYears: 3,
      workFormat: 'REMOTE',
      skills: [],
      achievementsCount: 0,
      matchScore: 90,
      matchBreakdown: {},
      reasons: [],
    });
    expect((item as any).email).toBeUndefined();
    expect(JSON.stringify(item)).not.toContain('@');
  });

  it('offer before accept hides candidate email from employer', () => {
    const offer = {
      id: 'o1',
      vacancyId: 'v1',
      companyId: 'c1',
      employerId: 'e1',
      candidateId: 'u1',
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      candidate: { id: 'u1', firstName: 'Иван', lastName: 'Петров', email: 'secret@example.ru', phone: '+7', candidateProfile: { id: 'p1' } },
      employer: { id: 'e1', firstName: 'HR', lastName: 'Boss', email: 'hr@co.ru' },
    };
    const res = toOfferResponse(offer as any, { id: 'e1', role: 'EMPLOYER' }, { includeCandidateContact: false });
    expect(res.candidate?.email).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain('secret@example.ru');
  });

  it('offer after accept can include candidate email for employer', () => {
    const offer = {
      id: 'o1',
      vacancyId: 'v1',
      companyId: 'c1',
      employerId: 'e1',
      candidateId: 'u1',
      status: 'ACCEPTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      candidate: { id: 'u1', firstName: 'Иван', lastName: 'Петров', email: 'ok@example.ru', phone: null, candidateProfile: { id: 'p1' } },
      employer: { id: 'e1', firstName: 'HR', lastName: 'Boss', email: 'hr@co.ru' },
    };
    const res = toOfferResponse(offer as any, { id: 'e1', role: 'EMPLOYER' }, { includeCandidateContact: true });
    expect(res.candidate?.email).toBe('ok@example.ru');
  });
});
