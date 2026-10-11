import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { AssessmentStatus, AttemptStatus, Grade, UserRole } from '@prisma/client';
import { AssessmentsService } from './assessments.service';
import { ScoringService } from './scoring.service';

describe('AssessmentsService security & flow', () => {
  const prisma: any = {
    candidateProfile: { findUnique: jest.fn() },
    assessment: { findUnique: jest.fn(), findMany: jest.fn() },
    assessmentAttempt: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assessmentQuestion: { findMany: jest.fn() },
    assessmentAnswer: { upsert: jest.fn() },
    assessmentResult: { create: jest.fn(), findMany: jest.fn() },
    candidateCategory: { findMany: jest.fn() },
    $transaction: jest.fn((fn: any) =>
      fn({
        assessmentAttempt: { update: jest.fn().mockResolvedValue({}) },
        assessmentResult: { create: jest.fn().mockResolvedValue({ id: 'res1', score: 82, status: 'PASSED', recommendedGrade: Grade.MIDDLE, selfDeclaredGrade: Grade.SENIOR, sectionScores: {}, createdAt: new Date() }) },
        candidateProfile: { update: jest.fn() },
      }),
    ),
  };

  const email = { assertVerified: jest.fn() };
  const categories = { resolveCategory: jest.fn().mockResolvedValue({ category: { id: 'cat1' } }) };
  const audit = { log: jest.fn() };
  const scoring = new ScoringService();

  let service: AssessmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssessmentsService(prisma, email as any, categories as any, scoring, audit as any);
  });

  it('не отдаёт correctAnswer в публичной попытке', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      specializationId: 's1',
      grade: Grade.MIDDLE,
      user: { emailVerified: true },
    });
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 60000),
      assessmentId: 'ass1',
      assessmentVersion: 1,
      totalQuestions: 1,
      assessment: { id: 'ass1', name: 'Backend', timeLimitSeconds: 1800, passingScore: 50, blueprints: [], thresholds: [] },
      questions: [
        {
          position: 0,
          questionId: 'q1',
          question: {
            id: 'q1',
            text: 'Q?',
            options: ['A', 'B'],
            type: 'SINGLE_CHOICE',
            skill: 'Python',
            difficulty: 'EASY',
            points: 1,
            correctOptionIndexes: [1],
            explanation: 'secret',
          },
        },
      ],
      answers: [],
      result: null,
    });

    const view = await service.getAttempt('a1', { id: 'u1', role: UserRole.CANDIDATE, emailVerified: true });
    expect(view.questions[0].correctOptionIndexes).toBeUndefined();
    expect(view.questions[0].explanation).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain('secret');
    expect(JSON.stringify(view)).not.toContain('correctOption');
  });

  it('Candidate A не читает attempt Candidate B', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'pA',
      userId: 'uA',
      user: { emailVerified: true },
    });
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'aB',
      candidateId: 'pB',
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 60000),
      assessment: { blueprints: [], thresholds: [] },
      questions: [],
      answers: [],
      result: null,
    });

    await expect(
      service.getAttempt('aB', { id: 'uA', role: UserRole.CANDIDATE, emailVerified: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cooldown блокирует повторный start', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      specializationId: 'spec',
      grade: Grade.MIDDLE,
      user: { emailVerified: true },
    });
    prisma.assessment.findUnique.mockResolvedValue({
      id: 'ass1',
      status: AssessmentStatus.PUBLISHED,
      specializationId: 'spec',
      version: 1,
      timeLimitSeconds: 1800,
      cooldownHours: 72,
      blueprints: [{ sections: [{ skill: 'Python', weight: 1, questionCount: 1 }] }],
    });
    prisma.assessmentAttempt.findFirst
      .mockResolvedValueOnce(null) // no active
      .mockResolvedValueOnce({
        submittedAt: new Date(),
        status: AttemptStatus.SUBMITTED,
      });

    await expect(
      service.start('ass1', { id: 'u1', role: UserRole.CANDIDATE, emailVerified: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('не принимает score от клиента при saveAnswer', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      user: { emailVerified: true },
    });
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 60000),
      assessment: { blueprints: [], thresholds: [] },
      questions: [
        {
          questionId: 'q1',
          question: { id: 'q1', options: ['A', 'B'], type: 'SINGLE_CHOICE' },
        },
      ],
      answers: [],
      result: null,
    });
    prisma.assessmentAnswer.upsert.mockResolvedValue({});

    await service.saveAnswer(
      'a1',
      { questionId: 'q1', selectedOptionIndexes: [0] },
      { id: 'u1', role: UserRole.CANDIDATE, emailVerified: true },
    );
    expect(prisma.assessmentAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.not.objectContaining({ isCorrect: true, score: expect.anything() }),
      }),
    );
  });

  it('SUBMITTED attempt нельзя менять', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      user: { emailVerified: true },
    });
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      status: AttemptStatus.SUBMITTED,
      expiresAt: new Date(Date.now() + 60000),
      assessment: { blueprints: [], thresholds: [] },
      questions: [],
      answers: [],
      result: null,
    });

    await expect(
      service.saveAnswer('a1', { questionId: 'q1', selectedOptionIndexes: [0] }, {
        id: 'u1',
        role: UserRole.CANDIDATE,
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
