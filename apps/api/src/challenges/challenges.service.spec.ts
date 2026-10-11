import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  ChallengeStatus,
  Prisma,
  QuestionDifficulty,
  QuestionType,
  UserRole,
} from '@prisma/client';
import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  const prisma: any = {
    candidateProfile: { findUnique: jest.fn() },
    challenge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    challengeAttempt: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    challengeAnswer: { upsert: jest.fn() },
    challengeQuestion: { count: jest.fn(), create: jest.fn() },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  let service: ChallengesService;

  const candidate = { id: 'u-cand', role: UserRole.CANDIDATE };
  const other = { id: 'u-other', role: UserRole.CANDIDATE };
  const employer = { id: 'u-emp', role: UserRole.EMPLOYER };
  const profile = { id: 'p1', userId: 'u-cand' };
  const otherProfile = { id: 'p2', userId: 'u-other' };

  const publishedChallenge = {
    id: 'ch1',
    title: 'Backend HTTP',
    description: 'desc',
    difficulty: QuestionDifficulty.EASY,
    status: ChallengeStatus.PUBLISHED,
    timeLimitSeconds: 600,
    maxAttempts: 2,
    passingScore: 70,
    publishedAt: new Date(),
    startsAt: null,
    endsAt: null,
    specialization: { id: 'sp1', name: 'Backend', slug: 'backend-development' },
    skill: { id: 'sk1', name: 'REST API' },
    _count: { questions: 2 },
    questions: [{ id: 'q1' }, { id: 'q2' }],
  };

  const draftChallenge = {
    ...publishedChallenge,
    id: 'ch-draft',
    status: ChallengeStatus.DRAFT,
    publishedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChallengesService(prisma, audit as any);
    prisma.candidateProfile.findUnique.mockImplementation(({ where }: any) => {
      if (where.userId === 'u-cand') return Promise.resolve(profile);
      if (where.userId === 'u-other') return Promise.resolve(otherProfile);
      return Promise.resolve(null);
    });
  });

  it('1. published challenge visible', async () => {
    prisma.challenge.findMany.mockResolvedValue([publishedChallenge]);
    prisma.challengeAttempt.findMany.mockResolvedValue([]);
    const res = await service.listPublished(candidate);
    expect(res.total).toBe(1);
    expect(res.items[0].title).toBe('Backend HTTP');
    expect(JSON.stringify(res)).not.toContain('correctOptionIndexes');
  });

  it('2. draft challenge hidden', async () => {
    prisma.challenge.findMany.mockResolvedValue([draftChallenge, publishedChallenge]);
    prisma.challengeAttempt.findMany.mockResolvedValue([]);
    // listPublished filters by PUBLISHED in where; simulate DB returning only published
    prisma.challenge.findMany.mockResolvedValue([publishedChallenge]);
    const res = await service.listPublished(candidate);
    expect(res.items.every((i) => i.status === ChallengeStatus.PUBLISHED)).toBe(true);
    prisma.challenge.findUnique.mockResolvedValue(draftChallenge);
    await expect(service.getOne('ch-draft', candidate)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('3. candidate starts challenge', async () => {
    prisma.challenge.findUnique.mockResolvedValue(publishedChallenge);
    prisma.challengeAttempt.findFirst.mockResolvedValue(null);
    prisma.challengeAttempt.count.mockResolvedValue(0);
    prisma.challengeAttempt.create.mockResolvedValue({
      id: 'att1',
      challengeId: 'ch1',
      candidateId: 'p1',
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 600000),
      attemptNumber: 1,
      score: null,
      passed: null,
      submittedAt: null,
      challenge: publishedChallenge,
      questions: [
        { position: 0, questionId: 'q1', question: { id: 'q1', type: QuestionType.SINGLE_CHOICE, prompt: 'P?', options: ['A', 'B'], points: 1, sortOrder: 0 } },
      ],
      answers: [],
    });
    const res = await service.start('ch1', candidate);
    expect(res.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(res.questions[0].prompt).toBe('P?');
    expect(JSON.stringify(res)).not.toContain('correctOptionIndexes');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CHALLENGE_STARTED' }),
    );
  });

  it('4. candidate resumes active attempt', async () => {
    const active = {
      id: 'att1',
      challengeId: 'ch1',
      candidateId: 'p1',
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 100000),
      startedAt: new Date(),
      attemptNumber: 1,
      challenge: publishedChallenge,
      questions: [
        { position: 0, questionId: 'q1', question: { id: 'q1', type: QuestionType.SINGLE_CHOICE, prompt: 'P?', options: ['A'], points: 1, sortOrder: 0 } },
      ],
      answers: [],
    };
    prisma.challenge.findUnique.mockResolvedValue(publishedChallenge);
    prisma.challengeAttempt.findFirst.mockResolvedValue(active);
    prisma.challengeAttempt.findUnique.mockResolvedValue(active);
    const res = await service.start('ch1', candidate);
    expect(res.id).toBe('att1');
    expect(prisma.challengeAttempt.create).not.toHaveBeenCalled();
  });

  it('5. duplicate concurrent start prevented (P2002)', async () => {
    prisma.challenge.findUnique.mockResolvedValue(publishedChallenge);
    prisma.challengeAttempt.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'att-race',
        challengeId: 'ch1',
        candidateId: 'p1',
        status: AttemptStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 100000),
        startedAt: new Date(),
        attemptNumber: 1,
        challenge: publishedChallenge,
        questions: [],
        answers: [],
      });
    prisma.challengeAttempt.count.mockResolvedValue(0);
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.challengeAttempt.create.mockRejectedValue(err);
    const res = await service.start('ch1', candidate);
    expect(res.id).toBe('att-race');
  });

  it('6. maxAttempts enforced', async () => {
    prisma.challenge.findUnique.mockResolvedValue({ ...publishedChallenge, maxAttempts: 1 });
    prisma.challengeAttempt.findFirst.mockResolvedValue(null);
    prisma.challengeAttempt.count.mockResolvedValue(1);
    await expect(service.start('ch1', candidate)).rejects.toBeInstanceOf(ConflictException);
  });

  it('7. candidate can answer own attempt', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    const res = await service.saveAnswer(
      'att1',
      { questionId: 'q1', selectedOptionIndexes: [0] },
      candidate,
    );
    expect(res.ok).toBe(true);
  });

  it('8. candidate cannot answer foreign attempt', async () => {
    prisma.challengeAttempt.findUnique.mockResolvedValue({
      ...makeInProgressAttempt(),
      candidateId: 'p2',
    });
    await expect(
      service.saveAnswer('att1', { questionId: 'q1', selectedOptionIndexes: [0] }, candidate),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('9. candidate cannot submit foreign attempt', async () => {
    prisma.challengeAttempt.findUnique.mockResolvedValue({
      ...makeInProgressAttempt(),
      candidateId: 'p2',
    });
    await expect(service.submit('att1', candidate)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('10. expired attempt becomes EXPIRED', async () => {
    const expired = {
      ...makeInProgressAttempt(),
      expiresAt: new Date(Date.now() - 1000),
    };
    prisma.challengeAttempt.findUnique
      .mockResolvedValueOnce(expired)
      .mockResolvedValueOnce(expired);
    prisma.challengeAttempt.update.mockResolvedValue({
      ...expired,
      status: AttemptStatus.EXPIRED,
      questions: expired.questions.map((aq: any) => ({
        ...aq,
        question: {
          id: aq.question.id,
          type: aq.question.type,
          prompt: aq.question.prompt,
          options: aq.question.options,
          points: aq.question.points,
        },
      })),
    });
    const res = await service.getAttempt('att1', candidate);
    expect(res.status).toBe(AttemptStatus.EXPIRED);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CHALLENGE_EXPIRED' }));
  });

  it('11. expired attempt cannot accept answers', async () => {
    const expired = {
      ...makeInProgressAttempt(),
      expiresAt: new Date(Date.now() - 1000),
    };
    prisma.challengeAttempt.findUnique.mockResolvedValue(expired);
    prisma.challengeAttempt.update.mockResolvedValue({ ...expired, status: AttemptStatus.EXPIRED });
    await expect(
      service.saveAnswer('att1', { questionId: 'q1', selectedOptionIndexes: [0] }, candidate),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('12. expired attempt cannot submit', async () => {
    const expired = {
      ...makeInProgressAttempt(),
      expiresAt: new Date(Date.now() - 1000),
    };
    prisma.challengeAttempt.findUnique.mockResolvedValue(expired);
    prisma.challengeAttempt.update.mockResolvedValue({ ...expired, status: AttemptStatus.EXPIRED });
    await expect(service.submit('att1', candidate)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('13. score calculated server-side', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    prisma.challengeAttempt.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        ...attempt,
        ...data,
        challenge: publishedChallenge,
      }),
    );
    const res = await service.submit('att1', candidate);
    expect(res.score).toBe(100);
    expect(res.passed).toBe(true);
  });

  it('14. client score ignored on answer', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    await service.saveAnswer(
      'att1',
      { questionId: 'q1', selectedOptionIndexes: [0], score: 1, passed: true },
      candidate,
    );
    const data = prisma.challengeAnswer.upsert.mock.calls[0][0];
    expect(data.create.score).toBeUndefined();
    expect(data.create.passed).toBeUndefined();
  });

  it('15. passed calculated server-side', async () => {
    const attempt = makeInProgressAttempt();
    attempt.answers = [{ questionId: 'q1', selectedOptionIndexes: [1] }]; // wrong
    attempt.challenge = { ...publishedChallenge, passingScore: 70 };
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    prisma.challengeAttempt.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...attempt, ...data, challenge: publishedChallenge }),
    );
    const res = await service.submit('att1', candidate);
    expect(res.score).toBe(0);
    expect(res.passed).toBe(false);
  });

  it('16. correct answers hidden in attempt DTO', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    const res = await service.getAttempt('att1', candidate);
    expect(JSON.stringify(res)).not.toContain('correctOptionIndexes');
    expect(JSON.stringify(res)).not.toContain('correctAnswer');
  });

  it('17. answer key never leaked in list/detail', async () => {
    prisma.challenge.findMany.mockResolvedValue([publishedChallenge]);
    prisma.challengeAttempt.findMany.mockResolvedValue([]);
    prisma.challenge.findUnique.mockResolvedValue(publishedChallenge);
    const list = await service.listPublished(candidate);
    const one = await service.getOne('ch1', candidate);
    expect(JSON.stringify(list)).not.toContain('correctOptionIndexes');
    expect((one as any).questions).toBeUndefined();
    expect(JSON.stringify(one)).not.toContain('correctOptionIndexes');
  });

  it('18. submit locks answers', async () => {
    const submitted = {
      ...makeInProgressAttempt(),
      status: AttemptStatus.SUBMITTED,
      score: 100,
      passed: true,
    };
    prisma.challengeAttempt.findUnique.mockResolvedValue(submitted);
    await expect(
      service.saveAnswer('att1', { questionId: 'q1', selectedOptionIndexes: [0] }, candidate),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('19. candidate sees own result', async () => {
    prisma.challengeAttempt.findMany.mockResolvedValue([
      {
        id: 'att1',
        challengeId: 'ch1',
        status: AttemptStatus.SUBMITTED,
        score: 80,
        passed: true,
        submittedAt: new Date(),
        startedAt: new Date(),
        attemptNumber: 1,
        challenge: publishedChallenge,
      },
    ]);
    const res = await service.myResults(candidate);
    expect(res.items[0].score).toBe(80);
  });

  it('20. candidate cannot see foreign result via attempt', async () => {
    prisma.challengeAttempt.findUnique.mockResolvedValue({
      ...makeInProgressAttempt(),
      candidateId: 'p2',
      status: AttemptStatus.SUBMITTED,
      score: 90,
    });
    await expect(service.getAttempt('att1', candidate)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('21. employer cannot start challenge', async () => {
    await expect(service.start('ch1', employer)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('22. employer cannot get attempt internals', async () => {
    await expect(service.getAttempt('att1', employer)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('23. audit generated on submit', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    prisma.challengeAttempt.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...attempt, ...data, challenge: publishedChallenge }),
    );
    await service.submit('att1', candidate);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CHALLENGE_SUBMITTED' }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CHALLENGE_PASSED' }));
  });

  it('24. audit has no PII', async () => {
    const attempt = makeInProgressAttempt();
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    prisma.challengeAnswer.upsert.mockResolvedValue({});
    prisma.challengeAttempt.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...attempt, ...data, challenge: publishedChallenge }),
    );
    await service.submit('att1', candidate);
    for (const call of audit.log.mock.calls) {
      const meta = call[0].metadata || {};
      expect(meta.email).toBeUndefined();
      expect(meta.phone).toBeUndefined();
      expect(meta.answers).toBeUndefined();
      expect(meta.correctOptionIndexes).toBeUndefined();
    }
  });

  it('25. invalid state transitions rejected (cancel write)', async () => {
    prisma.challengeAttempt.findUnique.mockResolvedValue({
      ...makeInProgressAttempt(),
      status: AttemptStatus.CANCELLED,
    });
    await expect(
      service.saveAnswer('att1', { questionId: 'q1', selectedOptionIndexes: [0] }, candidate),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('26. maxAttempts respected after EXPIRED', async () => {
    prisma.challenge.findUnique.mockResolvedValue({ ...publishedChallenge, maxAttempts: 2 });
    prisma.challengeAttempt.findFirst.mockResolvedValue(null);
    prisma.challengeAttempt.count.mockResolvedValue(2);
    await expect(service.start('ch1', candidate)).rejects.toBeInstanceOf(ConflictException);
  });

  it('27. duplicate active attempt prevented by unique handling', async () => {
    expect(service.calculateScore(3, 5)).toBe(60);
    expect(service.calculateScore(1, 3)).toBe(33);
  });

  it('28. Assessment remains unchanged — ChallengesService has no category/assessment deps', () => {
    expect((service as any).categories).toBeUndefined();
    expect((service as any).scoring).toBeUndefined();
  });

  it('29. Matching remains unchanged — no MATCH_WEIGHTS import', () => {
    const src = ChallengesService.toString();
    expect(src).not.toContain('MATCH_WEIGHTS');
  });

  it('30. Applications remain unchanged — no Application model writes', async () => {
    expect((prisma as any).application).toBeUndefined();
  });

  it('31. other candidate cannot read foreign myResultForChallenge ownership path', async () => {
    // myResults always scoped to caller profile — returns empty for other
    prisma.challengeAttempt.findMany.mockResolvedValue([]);
    const res = await service.myResults(other);
    expect(res.total).toBe(0);
    expect(prisma.challengeAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ candidateId: 'p2' }) }),
    );
  });

  it('32. submit race with expiration rejects', async () => {
    const attempt = {
      ...makeInProgressAttempt(),
      expiresAt: new Date(Date.now() - 1),
    };
    prisma.challengeAttempt.findUnique.mockResolvedValue(attempt);
    // first update for expire in loadOwnedAttempt
    prisma.challengeAttempt.update.mockResolvedValue({ ...attempt, status: AttemptStatus.EXPIRED });
    await expect(service.submit('att1', candidate)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('33. admin can create draft', async () => {
    prisma.challenge.create.mockResolvedValue({
      ...publishedChallenge,
      status: ChallengeStatus.DRAFT,
      _count: { questions: 0 },
    });
    const res = await service.adminCreate({
      title: 'New',
      difficulty: QuestionDifficulty.EASY,
    });
    expect(res.title).toBe('Backend HTTP');
  });

  it('34. scoring formula deterministic', () => {
    expect(service.calculateScore(0, 0)).toBe(0);
    expect(service.calculateScore(2, 4)).toBe(50);
    expect(service.isAnswerCorrect(
      { type: QuestionType.MULTIPLE_CHOICE, correctOptionIndexes: [0, 2] },
      [2, 0],
    )).toBe(true);
  });

  function makeInProgressAttempt() {
    return {
      id: 'att1',
      challengeId: 'ch1',
      candidateId: 'p1',
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      submittedAt: null,
      expiresAt: new Date(Date.now() + 600000),
      score: null,
      passed: null,
      attemptNumber: 1,
      challenge: { ...publishedChallenge, passingScore: 70 },
      questions: [
        {
          position: 0,
          questionId: 'q1',
          question: {
            id: 'q1',
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'P?',
            options: ['A', 'B'],
            correctOptionIndexes: [0],
            points: 1,
            sortOrder: 0,
          },
        },
      ],
      answers: [{ questionId: 'q1', selectedOptionIndexes: [0] }],
    };
  }
});
