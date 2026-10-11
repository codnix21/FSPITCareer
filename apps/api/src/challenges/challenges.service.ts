import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  ChallengeStatus,
  Prisma,
  QuestionType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditService } from '../privacy/audit.service';
import {
  AdminChallengeQuestionDto,
  AdminCreateChallengeDto,
  AdminUpdateChallengeDto,
  SaveChallengeAnswerDto,
} from './dto/challenge.dto';

type AuthUser = { id: string; role: UserRole; emailVerified?: boolean };

const SAFE_QUESTION_SELECT = {
  id: true,
  type: true,
  prompt: true,
  options: true,
  points: true,
  sortOrder: true,
} as const;

const CHALLENGE_META_INCLUDE = {
  specialization: { select: { id: true, name: true, slug: true } },
  skill: { select: { id: true, name: true } },
  _count: { select: { questions: true } },
} as const;

@Injectable()
export class ChallengesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private assertCandidate(user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно только соискателю');
    }
  }

  private async getCandidateProfile(user: AuthUser) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    return profile;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private arraysEqualSorted(a: number[], b: number[]) {
    if (a.length !== b.length) return false;
    const aa = [...a].sort((x, y) => x - y);
    const bb = [...b].sort((x, y) => x - y);
    return aa.every((v, i) => v === bb[i]);
  }

  isAnswerCorrect(
    question: { type: QuestionType; correctOptionIndexes: number[] },
    selected: number[],
  ) {
    if (question.type === QuestionType.SINGLE_CHOICE) {
      return selected.length === 1 && question.correctOptionIndexes.includes(selected[0]);
    }
    return this.arraysEqualSorted(selected, question.correctOptionIndexes);
  }

  /** Deterministic: earned/max * 100, rounded to integer */
  calculateScore(earnedPoints: number, maxPoints: number) {
    if (maxPoints <= 0) return 0;
    return Math.round((earnedPoints / maxPoints) * 100);
  }

  private isChallengeAvailable(c: {
    status: ChallengeStatus;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {
    if (c.status !== ChallengeStatus.PUBLISHED) return false;
    const now = Date.now();
    if (c.startsAt && c.startsAt.getTime() > now) return false;
    if (c.endsAt && c.endsAt.getTime() < now) return false;
    return true;
  }

  private toPublicChallenge(
    c: any,
    extras?: { attemptsUsed?: number; activeAttemptId?: string | null; bestPassed?: boolean | null; bestScore?: number | null },
  ) {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      status: c.status,
      timeLimitSeconds: c.timeLimitSeconds,
      maxAttempts: c.maxAttempts,
      passingScore: c.passingScore,
      publishedAt: c.publishedAt,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      specialization: c.specialization ?? null,
      skill: c.skill ?? null,
      questionCount: c._count?.questions ?? c.questions?.length ?? 0,
      attemptsUsed: extras?.attemptsUsed ?? 0,
      activeAttemptId: extras?.activeAttemptId ?? null,
      bestPassed: extras?.bestPassed ?? null,
      bestScore: extras?.bestScore ?? null,
    };
  }

  private stripQuestionKey(q: any) {
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    };
  }

  private toPublicAttempt(attempt: any, includeQuestions = false) {
    const base: any = {
      id: attempt.id,
      challengeId: attempt.challengeId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      score: attempt.score,
      passed: attempt.passed,
      attemptNumber: attempt.attemptNumber,
      challenge: attempt.challenge
        ? {
            id: attempt.challenge.id,
            title: attempt.challenge.title,
            difficulty: attempt.challenge.difficulty,
            timeLimitSeconds: attempt.challenge.timeLimitSeconds,
            passingScore: attempt.challenge.passingScore,
            maxAttempts: attempt.challenge.maxAttempts,
            specialization: attempt.challenge.specialization ?? null,
            skill: attempt.challenge.skill ?? null,
          }
        : undefined,
    };

    if (includeQuestions && attempt.questions) {
      const answersByQ = new Map<string, number[]>(
        (attempt.answers || []).map((a: any) => [a.questionId, a.selectedOptionIndexes]),
      );
      base.questions = [...attempt.questions]
        .sort((a: any, b: any) => a.position - b.position)
        .map((aq: any, idx: number) => ({
          number: idx + 1,
          ...this.stripQuestionKey(aq.question),
          selectedOptionIndexes: answersByQ.get(aq.question.id) || [],
        }));
    }

    return base;
  }

  private toResultSummary(attempt: any) {
    return {
      id: attempt.id,
      challengeId: attempt.challengeId,
      status: attempt.status,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      attemptNumber: attempt.attemptNumber,
      challenge: attempt.challenge
        ? {
            id: attempt.challenge.id,
            title: attempt.challenge.title,
            difficulty: attempt.challenge.difficulty,
            specialization: attempt.challenge.specialization ?? null,
            skill: attempt.challenge.skill ?? null,
            passingScore: attempt.challenge.passingScore,
            maxAttempts: attempt.challenge.maxAttempts,
          }
        : null,
    };
  }

  async listPublished(user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);

    const items = await this.prisma.challenge.findMany({
      where: { status: ChallengeStatus.PUBLISHED },
      include: CHALLENGE_META_INCLUDE,
      orderBy: [{ difficulty: 'asc' }, { title: 'asc' }],
    });

    const available = items.filter((c) => this.isChallengeAvailable(c));

    const attempts = await this.prisma.challengeAttempt.findMany({
      where: {
        candidateId: profile.id,
        challengeId: { in: available.map((c) => c.id) },
      },
      select: {
        id: true,
        challengeId: true,
        status: true,
        score: true,
        passed: true,
      },
    });

    const byChallenge = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const list = byChallenge.get(a.challengeId) || [];
      list.push(a);
      byChallenge.set(a.challengeId, list);
    }

    return {
      total: available.length,
      items: available.map((c) => {
        const list = byChallenge.get(c.id) || [];
        const counted = list.filter((a) =>
          a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
        );
        const active = list.find((a) => a.status === AttemptStatus.IN_PROGRESS);
        const submitted = list.filter((a) => a.status === AttemptStatus.SUBMITTED);
        const best = submitted.reduce<{ score: number | null; passed: boolean | null }>(
          (acc, a) => {
            if (a.score == null) return acc;
            if (acc.score == null || a.score > acc.score) {
              return { score: a.score, passed: a.passed };
            }
            return acc;
          },
          { score: null, passed: null },
        );
        return this.toPublicChallenge(c, {
          attemptsUsed: counted.length,
          activeAttemptId: active?.id ?? null,
          bestPassed: best.passed,
          bestScore: best.score,
        });
      }),
    };
  }

  async getOne(id: string, user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    const c = await this.prisma.challenge.findUnique({
      where: { id },
      include: CHALLENGE_META_INCLUDE,
    });
    if (!c || !this.isChallengeAvailable(c)) {
      throw new NotFoundException('Задание не найдено');
    }

    const attempts = await this.prisma.challengeAttempt.findMany({
      where: { candidateId: profile.id, challengeId: id },
      select: { id: true, status: true, score: true, passed: true },
    });
    const counted = attempts.filter(
      (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.EXPIRED,
    );
    const active = attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    const submitted = attempts.filter((a) => a.status === AttemptStatus.SUBMITTED);
    const best = submitted.reduce<{ score: number | null; passed: boolean | null }>(
      (acc, a) => {
        if (a.score == null) return acc;
        if (acc.score == null || a.score > acc.score) {
          return { score: a.score, passed: a.passed };
        }
        return acc;
      },
      { score: null, passed: null },
    );

    // Never include questions or correct answers on public detail
    return this.toPublicChallenge(c, {
      attemptsUsed: counted.length,
      activeAttemptId: active?.id ?? null,
      bestPassed: best.passed,
      bestScore: best.score,
    });
  }

  private async expireIfNeeded(attemptId: string) {
    const attempt = await this.prisma.challengeAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return null;
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      const updated = await this.prisma.challengeAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
      });
      await this.audit.log({
        action: AuditAction.CHALLENGE_EXPIRED,
        entityType: 'ChallengeAttempt',
        entityId: attemptId,
        metadata: {
          challengeId: attempt.challengeId,
          candidateId: attempt.candidateId,
          attemptId,
        },
      });
      return updated;
    }
    return attempt;
  }

  async start(challengeId: string, user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);

    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        ...CHALLENGE_META_INCLUDE,
        questions: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!challenge || !this.isChallengeAvailable(challenge)) {
      throw new NotFoundException('Задание не опубликовано');
    }
    if (!challenge.questions.length) {
      throw new BadRequestException('У задания нет вопросов');
    }

    const active = await this.prisma.challengeAttempt.findFirst({
      where: {
        candidateId: profile.id,
        challengeId,
        status: AttemptStatus.IN_PROGRESS,
      },
      include: {
        challenge: { include: CHALLENGE_META_INCLUDE },
        questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
        answers: true,
      },
    });
    if (active) {
      const maybe = await this.expireIfNeeded(active.id);
      if (maybe && maybe.status === AttemptStatus.IN_PROGRESS) {
        return this.toPublicAttempt(active, true);
      }
    }

    const usedCount = await this.prisma.challengeAttempt.count({
      where: {
        candidateId: profile.id,
        challengeId,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
      },
    });
    if (usedCount >= challenge.maxAttempts) {
      throw new ConflictException({
        code: 'CHALLENGE_ATTEMPTS_EXHAUSTED',
        message: 'Попытки исчерпаны',
        maxAttempts: challenge.maxAttempts,
      });
    }

    const ordered = this.shuffle(challenge.questions);
    const expiresAt = challenge.timeLimitSeconds
      ? new Date(Date.now() + challenge.timeLimitSeconds * 1000)
      : null;

    try {
      const attempt = await this.prisma.challengeAttempt.create({
        data: {
          candidateId: profile.id,
          challengeId,
          status: AttemptStatus.IN_PROGRESS,
          expiresAt,
          attemptNumber: usedCount + 1,
          questions: {
            create: ordered.map((q, position) => ({
              questionId: q.id,
              position,
            })),
          },
        },
        include: {
          challenge: { include: CHALLENGE_META_INCLUDE },
          questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
          answers: true,
        },
      });

      await this.audit.log({
        actorUserId: user.id,
        action: AuditAction.CHALLENGE_STARTED,
        entityType: 'ChallengeAttempt',
        entityId: attempt.id,
        metadata: {
          challengeId,
          candidateId: profile.id,
          attemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
        },
      });

      return this.toPublicAttempt(attempt, true);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const resumed = await this.prisma.challengeAttempt.findFirst({
          where: {
            candidateId: profile.id,
            challengeId,
            status: AttemptStatus.IN_PROGRESS,
          },
          include: {
            challenge: { include: CHALLENGE_META_INCLUDE },
            questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
            answers: true,
          },
        });
        if (resumed) return this.toPublicAttempt(resumed, true);
        throw new ConflictException('Активная попытка уже существует');
      }
      throw e;
    }
  }

  private async loadOwnedAttempt(attemptId: string, user: AuthUser, forWrite = false) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);

    let attempt = await this.prisma.challengeAttempt.findUnique({
      where: { id: attemptId },
      include: {
        challenge: { include: CHALLENGE_META_INCLUDE },
        questions: { include: { question: true } },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Попытка не найдена');
    if (user.role !== UserRole.ADMIN && attempt.candidateId !== profile.id) {
      throw new ForbiddenException('Нет доступа к этой попытке');
    }

    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      attempt.expiresAt &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      attempt = await this.prisma.challengeAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
        include: {
          challenge: { include: CHALLENGE_META_INCLUDE },
          questions: { include: { question: true } },
          answers: true,
        },
      });
      await this.audit.log({
        actorUserId: user.id,
        action: AuditAction.CHALLENGE_EXPIRED,
        entityType: 'ChallengeAttempt',
        entityId: attemptId,
        metadata: {
          challengeId: attempt.challengeId,
          candidateId: attempt.candidateId,
          attemptId,
        },
      });
    }

    if (forWrite) {
      if (attempt.status === AttemptStatus.SUBMITTED) {
        throw new BadRequestException('Попытка уже завершена');
      }
      if (attempt.status === AttemptStatus.EXPIRED) {
        throw new BadRequestException('Время попытки истекло');
      }
      if (attempt.status === AttemptStatus.CANCELLED) {
        throw new BadRequestException('Попытка отменена');
      }
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException('Попытка недоступна для изменения');
      }
    }

    return { attempt, profile };
  }

  async getAttempt(attemptId: string, user: AuthUser) {
    const { attempt } = await this.loadOwnedAttempt(attemptId, user, false);
    const safe = {
      ...attempt,
      questions: attempt.questions.map((aq) => ({
        ...aq,
        question: this.stripQuestionKey(aq.question),
      })),
    };
    return this.toPublicAttempt(safe, true);
  }

  async saveAnswer(attemptId: string, dto: SaveChallengeAnswerDto, user: AuthUser) {
    const { attempt } = await this.loadOwnedAttempt(attemptId, user, true);
    const linked = attempt.questions.find((q) => q.questionId === dto.questionId);
    if (!linked) throw new BadRequestException('Вопрос не относится к этой попытке');

    const q = linked.question;
    for (const idx of dto.selectedOptionIndexes) {
      if (idx < 0 || idx >= q.options.length) {
        throw new BadRequestException('Некорректный вариант ответа');
      }
    }
    if (q.type === QuestionType.SINGLE_CHOICE && dto.selectedOptionIndexes.length !== 1) {
      throw new BadRequestException('Выберите один вариант');
    }

    // Ignore client score/passed — never trust them
    await this.prisma.challengeAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: {
        attemptId,
        questionId: dto.questionId,
        selectedOptionIndexes: dto.selectedOptionIndexes,
      },
      update: {
        selectedOptionIndexes: dto.selectedOptionIndexes,
        answeredAt: new Date(),
        isCorrect: null,
      },
    });

    return { ok: true };
  }

  async submit(attemptId: string, user: AuthUser) {
    const { attempt } = await this.loadOwnedAttempt(attemptId, user, true);

    // Re-check expiration under race with submit
    if (attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()) {
      await this.prisma.challengeAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
      });
      await this.audit.log({
        actorUserId: user.id,
        action: AuditAction.CHALLENGE_EXPIRED,
        entityType: 'ChallengeAttempt',
        entityId: attemptId,
        metadata: {
          challengeId: attempt.challengeId,
          candidateId: attempt.candidateId,
          attemptId,
        },
      });
      throw new BadRequestException('Время попытки истекло');
    }

    const questions = attempt.questions.map((aq) => aq.question);
    const answersByQuestionId = new Map(
      attempt.answers.map((a) => [a.questionId, a.selectedOptionIndexes]),
    );

    let earned = 0;
    let max = 0;
    for (const q of questions) {
      max += q.points;
      const selected = answersByQuestionId.get(q.id) || [];
      const ok = this.isAnswerCorrect(q, selected);
      if (ok) earned += q.points;
      await this.prisma.challengeAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: q.id } },
        create: {
          attemptId,
          questionId: q.id,
          selectedOptionIndexes: selected,
          isCorrect: ok,
        },
        update: { isCorrect: ok },
      });
    }

    const score = this.calculateScore(earned, max);
    const passed = score >= attempt.challenge.passingScore;

    const updated = await this.prisma.challengeAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        score,
        passed,
      },
      include: {
        challenge: { include: CHALLENGE_META_INCLUDE },
        questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
        answers: true,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.CHALLENGE_SUBMITTED,
      entityType: 'ChallengeAttempt',
      entityId: attemptId,
      metadata: {
        challengeId: attempt.challengeId,
        candidateId: attempt.candidateId,
        attemptId,
        score,
        passed,
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: passed ? AuditAction.CHALLENGE_PASSED : AuditAction.CHALLENGE_FAILED,
      entityType: 'ChallengeAttempt',
      entityId: attemptId,
      metadata: {
        challengeId: attempt.challengeId,
        candidateId: attempt.candidateId,
        attemptId,
        score,
        passed,
      },
    });

    return this.toResultSummary(updated);
  }

  async myResults(user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    const items = await this.prisma.challengeAttempt.findMany({
      where: {
        candidateId: profile.id,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
      },
      include: { challenge: { include: CHALLENGE_META_INCLUDE } },
      orderBy: { submittedAt: 'desc' },
    });
    return { total: items.length, items: items.map((a) => this.toResultSummary(a)) };
  }

  async myResultForChallenge(challengeId: string, user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    const items = await this.prisma.challengeAttempt.findMany({
      where: {
        candidateId: profile.id,
        challengeId,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
      },
      include: { challenge: { include: CHALLENGE_META_INCLUDE } },
      orderBy: { submittedAt: 'desc' },
    });
    return { total: items.length, items: items.map((a) => this.toResultSummary(a)) };
  }

  // ── Admin ──────────────────────────────────────────────

  async adminList() {
    const items = await this.prisma.challenge.findMany({
      include: {
        ...CHALLENGE_META_INCLUDE,
        questions: { select: { id: true, prompt: true, type: true, points: true, sortOrder: true, isActive: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      total: items.length,
      items: items.map((c) => ({
        ...this.toPublicChallenge(c),
        questions: c.questions,
      })),
    };
  }

  async adminCreate(dto: AdminCreateChallengeDto) {
    const challenge = await this.prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description,
        specializationId: dto.specializationId,
        skillId: dto.skillId,
        difficulty: dto.difficulty,
        timeLimitSeconds: dto.timeLimitSeconds,
        maxAttempts: dto.maxAttempts ?? 1,
        passingScore: dto.passingScore ?? 70,
        status: ChallengeStatus.DRAFT,
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, i) => this.mapAdminQuestion(q, i)),
            }
          : undefined,
      },
      include: CHALLENGE_META_INCLUDE,
    });
    return this.toPublicChallenge(challenge);
  }

  async adminUpdate(id: string, dto: AdminUpdateChallengeDto) {
    const existing = await this.prisma.challenge.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Задание не найдено');
    const challenge = await this.prisma.challenge.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        specializationId: dto.specializationId,
        skillId: dto.skillId,
        difficulty: dto.difficulty,
        timeLimitSeconds: dto.timeLimitSeconds === undefined ? undefined : dto.timeLimitSeconds,
        maxAttempts: dto.maxAttempts,
        passingScore: dto.passingScore,
      },
      include: CHALLENGE_META_INCLUDE,
    });
    return this.toPublicChallenge(challenge);
  }

  async adminAddQuestion(challengeId: string, dto: AdminChallengeQuestionDto) {
    const c = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!c) throw new NotFoundException('Задание не найдено');
    const count = await this.prisma.challengeQuestion.count({ where: { challengeId } });
    return this.prisma.challengeQuestion.create({
      data: {
        challengeId,
        ...this.mapAdminQuestion(dto, dto.sortOrder ?? count),
      },
      select: {
        id: true,
        type: true,
        prompt: true,
        options: true,
        points: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }

  private mapAdminQuestion(q: AdminChallengeQuestionDto, sortOrder: number) {
    for (const idx of q.correctOptionIndexes) {
      if (idx < 0 || idx >= q.options.length) {
        throw new BadRequestException('Некорректный correctOptionIndexes');
      }
    }
    return {
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      correctOptionIndexes: q.correctOptionIndexes,
      points: q.points ?? 1,
      sortOrder,
      isActive: true,
    };
  }

  async adminSetStatus(id: string, status: ChallengeStatus) {
    const existing = await this.prisma.challenge.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Задание не найдено');
    const data: Prisma.ChallengeUpdateInput = { status };
    if (status === ChallengeStatus.PUBLISHED && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
    const challenge = await this.prisma.challenge.update({
      where: { id },
      data,
      include: CHALLENGE_META_INCLUDE,
    });
    return this.toPublicChallenge(challenge);
  }
}
