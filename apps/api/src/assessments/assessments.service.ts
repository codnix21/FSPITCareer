import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentResultStatus,
  AssessmentStatus,
  AttemptStatus,
  Grade,
  ProfileStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationService } from '../email/email-verification.service';
import { CandidateCategoryService } from '../taxonomy/candidate-category.service';
import { AuditAction, AuditService } from '../privacy/audit.service';
import { ScoringService } from './scoring.service';
import { AdminCreateAssessmentDto, AdminCreateQuestionDto, SaveAnswerDto } from './dto/assessment.dto';

type AuthUser = { id: string; role: UserRole; emailVerified?: boolean };

const SAFE_QUESTION_SELECT = {
  id: true,
  text: true,
  options: true,
  type: true,
  skill: true,
  difficulty: true,
  points: true,
} as const;

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailVerificationService,
    private categories: CandidateCategoryService,
    private scoring: ScoringService,
    private audit: AuditService,
  ) {}

  private async getCandidateProfile(user: AuthUser) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      include: { user: true, specialization: true },
    });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    return profile;
  }

  private assertCandidate(user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно только соискателю');
    }
  }

  async listPublished(user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    const where: any = { status: AssessmentStatus.PUBLISHED };
    if (profile.specializationId) {
      where.specializationId = profile.specializationId;
    }
    const items = await this.prisma.assessment.findMany({
      where,
      include: {
        specialization: { select: { id: true, name: true, slug: true } },
        industry: { select: { id: true, name: true, slug: true } },
        blueprints: { include: { sections: true }, take: 1, orderBy: { version: 'desc' } },
        _count: { select: { questions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      total: items.length,
      items: items.map((a) => {
        const sections = a.blueprints[0]?.sections || [];
        const questionCount = sections.reduce((s, x) => s + x.questionCount, 0);
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          version: a.version,
          status: a.status,
          timeLimitSeconds: a.timeLimitSeconds,
          passingScore: a.passingScore,
          cooldownHours: a.cooldownHours,
          industry: a.industry,
          specialization: a.specialization,
          questionCount: questionCount || a._count.questions,
          bankSize: a._count.questions,
        };
      }),
    };
  }

  async getOne(id: string, user: AuthUser) {
    this.assertCandidate(user);
    const a = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        specialization: { select: { id: true, name: true, slug: true } },
        industry: { select: { id: true, name: true, slug: true } },
        blueprints: { include: { sections: true }, take: 1, orderBy: { version: 'desc' } },
        thresholds: true,
        _count: { select: { questions: true } },
      },
    });
    if (!a || a.status !== AssessmentStatus.PUBLISHED) {
      throw new NotFoundException('Тест не найден');
    }
    const sections = a.blueprints[0]?.sections || [];
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      version: a.version,
      timeLimitSeconds: a.timeLimitSeconds,
      passingScore: a.passingScore,
      cooldownHours: a.cooldownHours,
      industry: a.industry,
      specialization: a.specialization,
      questionCount: sections.reduce((s, x) => s + x.questionCount, 0),
      sections: sections.map((s) => ({
        skill: s.skill,
        weight: s.weight,
        questionCount: s.questionCount,
        difficulty: s.difficulty,
      })),
      // thresholds exposed as grade bands for transparency (not scoring formula internals)
      gradeBands: a.thresholds
        .map((t) => ({ grade: t.grade, minScore: t.minScore, maxScore: t.maxScore }))
        .sort((x, y) => x.minScore - y.minScore),
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private async expireIfNeeded(attemptId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return null;
    if (attempt.status === AttemptStatus.IN_PROGRESS && attempt.expiresAt.getTime() <= Date.now()) {
      return this.prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
      });
    }
    return attempt;
  }

  private toPublicAttempt(attempt: any, includeQuestions = false) {
    const base: any = {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      assessmentVersion: attempt.assessmentVersion,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      recommendedGrade: attempt.recommendedGrade,
      selfDeclaredGrade: attempt.selfDeclaredGrade,
      assessment: attempt.assessment
        ? {
            id: attempt.assessment.id,
            name: attempt.assessment.name,
            timeLimitSeconds: attempt.assessment.timeLimitSeconds,
            passingScore: attempt.assessment.passingScore,
          }
        : undefined,
      result: attempt.result
        ? {
            id: attempt.result.id,
            score: attempt.result.score,
            status: attempt.result.status,
            recommendedGrade: attempt.result.recommendedGrade,
            selfDeclaredGrade: attempt.result.selfDeclaredGrade,
            sectionScores: attempt.result.sectionScores,
            candidateCategoryId: attempt.result.candidateCategoryId,
            createdAt: attempt.result.createdAt,
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
          id: aq.question.id,
          text: aq.question.text,
          options: aq.question.options,
          type: aq.question.type,
          selectedOptionIndexes: answersByQ.get(aq.question.id) || [],
        }));
    }

    return base;
  }

  async start(assessmentId: string, user: AuthUser) {
    this.assertCandidate(user);
    this.email.assertVerified({ emailVerified: user.emailVerified });
    const profile = await this.getCandidateProfile(user);
    if (!profile.user.emailVerified) {
      this.email.assertVerified({ emailVerified: false });
    }
    if (!profile.specializationId) {
      throw new BadRequestException('Сначала укажите специализацию в онбординге');
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        blueprints: { include: { sections: true }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!assessment || assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new NotFoundException('Тест не опубликован');
    }
    if (assessment.specializationId !== profile.specializationId) {
      throw new ForbiddenException('Тест не соответствует вашей специализации');
    }

    const active = await this.prisma.assessmentAttempt.findFirst({
      where: { candidateId: profile.id, assessmentId, status: AttemptStatus.IN_PROGRESS },
      include: {
        assessment: true,
        questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
        answers: true,
        result: true,
      },
    });
    if (active) {
      const maybe = await this.expireIfNeeded(active.id);
      if (maybe && maybe.status === AttemptStatus.IN_PROGRESS) {
        return this.toPublicAttempt(active, true);
      }
    }

    const lastSubmitted = await this.prisma.assessmentAttempt.findFirst({
      where: {
        candidateId: profile.id,
        assessmentId,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] },
      },
      orderBy: { submittedAt: 'desc' },
    });
    if (lastSubmitted) {
      const anchor = lastSubmitted.submittedAt || lastSubmitted.expiresAt || lastSubmitted.startedAt;
      const retryAt = new Date(anchor.getTime() + assessment.cooldownHours * 3600 * 1000);
      if (retryAt.getTime() > Date.now()) {
        throw new ConflictException({
          code: 'ASSESSMENT_COOLDOWN',
          message: 'Повторная попытка пока недоступна',
          retryAt: retryAt.toISOString(),
        });
      }
    }

    const blueprint = assessment.blueprints[0];
    if (!blueprint?.sections?.length) {
      throw new BadRequestException('У теста нет blueprint');
    }

    const selected: { questionId: string; position: number }[] = [];
    let position = 0;
    for (const section of blueprint.sections) {
      const pool = await this.prisma.assessmentQuestion.findMany({
        where: {
          assessmentId,
          isActive: true,
          skill: section.skill,
          ...(section.difficulty ? { difficulty: section.difficulty } : {}),
        },
        select: { id: true },
        take: Math.max(section.questionCount * 4, 20),
      });
      if (pool.length < section.questionCount) {
        throw new BadRequestException(`Недостаточно вопросов для раздела ${section.skill}`);
      }
      const picked = this.shuffle(pool).slice(0, section.questionCount);
      for (const q of picked) {
        selected.push({ questionId: q.id, position: position++ });
      }
    }

    const expiresAt = new Date(Date.now() + assessment.timeLimitSeconds * 1000);
    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        candidateId: profile.id,
        assessmentId,
        assessmentVersion: assessment.version,
        expiresAt,
        status: AttemptStatus.IN_PROGRESS,
        totalQuestions: selected.length,
        selfDeclaredGrade: profile.grade,
        questions: { create: selected },
      },
      include: {
        assessment: true,
        questions: { include: { question: { select: SAFE_QUESTION_SELECT } } },
        answers: true,
        result: true,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.ASSESSMENT_STARTED,
      entityType: 'AssessmentAttempt',
      entityId: attempt.id,
      metadata: { assessmentId, candidateId: profile.id, version: assessment.version },
    });

    return this.toPublicAttempt(attempt, true);
  }

  private async loadOwnedAttempt(attemptId: string, user: AuthUser, forWrite = false) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    let attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { include: { blueprints: { include: { sections: true }, take: 1, orderBy: { version: 'desc' } }, thresholds: true } },
        questions: { include: { question: true } },
        answers: true,
        result: true,
      },
    });
    if (!attempt) throw new NotFoundException('Попытка не найдена');
    if (user.role !== UserRole.ADMIN && attempt.candidateId !== profile.id) {
      throw new ForbiddenException('Нет доступа к этой попытке');
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS && attempt.expiresAt.getTime() <= Date.now()) {
      attempt = await this.prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED },
        include: {
          assessment: { include: { blueprints: { include: { sections: true }, take: 1, orderBy: { version: 'desc' } }, thresholds: true } },
          questions: { include: { question: true } },
          answers: true,
          result: true,
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
        question: {
          id: aq.question.id,
          text: aq.question.text,
          options: aq.question.options,
          type: aq.question.type,
          skill: aq.question.skill,
          difficulty: aq.question.difficulty,
          points: aq.question.points,
        },
      })),
    };
    return this.toPublicAttempt(safe, true);
  }

  async saveAnswer(attemptId: string, dto: SaveAnswerDto, user: AuthUser) {
    const { attempt } = await this.loadOwnedAttempt(attemptId, user, true);
    const linked = attempt.questions.find((q) => q.questionId === dto.questionId);
    if (!linked) throw new BadRequestException('Вопрос не относится к этой попытке');

    const q = linked.question;
    for (const idx of dto.selectedOptionIndexes) {
      if (idx < 0 || idx >= q.options.length) {
        throw new BadRequestException('Некорректный вариант ответа');
      }
    }
    if (q.type === 'SINGLE_CHOICE' && dto.selectedOptionIndexes.length !== 1) {
      throw new BadRequestException('Выберите один вариант');
    }

    await this.prisma.assessmentAnswer.upsert({
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
    const { attempt, profile } = await this.loadOwnedAttempt(attemptId, user, true);

    const sections = attempt.assessment.blueprints[0]?.sections || [];
    const questions = attempt.questions.map((aq) => aq.question);
    const answersByQuestionId = new Map(
      attempt.answers.map((a) => [a.questionId, a.selectedOptionIndexes]),
    );

    const scored = this.scoring.calculateWeightedScore({
      questions,
      sections: sections.map((s) => ({ skill: s.skill, weight: s.weight })),
      answersByQuestionId,
    });

    const recommendedGrade = this.scoring.recommendGrade(scored.score, attempt.assessment.thresholds);
    const passed = scored.score >= attempt.assessment.passingScore;
    const resultStatus = passed ? AssessmentResultStatus.PASSED : AssessmentResultStatus.FAILED;

    // Persist isCorrect flags (immutable after submit via attempt status)
    for (const q of questions) {
      const selected = answersByQuestionId.get(q.id) || [];
      const isCorrect = this.scoring.isAnswerCorrect(q, selected);
      await this.prisma.assessmentAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: q.id } },
        create: {
          attemptId,
          questionId: q.id,
          selectedOptionIndexes: selected,
          isCorrect,
        },
        update: { isCorrect },
      });
    }

    let categoryId: string | null = null;
    if (passed && profile.specializationId) {
      const { category } = await this.categories.resolveCategory(profile.specializationId, recommendedGrade);
      categoryId = category.id;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAttempt = await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          score: scored.score,
          correctAnswers: scored.correctAnswers,
          totalQuestions: scored.totalQuestions,
          recommendedGrade,
        },
      });

      const created = await tx.assessmentResult.create({
        data: {
          attemptId,
          candidateId: profile.id,
          assessmentId: attempt.assessmentId,
          assessmentVersion: attempt.assessmentVersion,
          score: scored.score,
          status: resultStatus,
          recommendedGrade,
          selfDeclaredGrade: attempt.selfDeclaredGrade || profile.grade,
          candidateCategoryId: categoryId,
          sectionScores: scored.sectionScores,
        },
      });

      if (passed && categoryId && profile.user.emailVerified && profile.specializationId) {
        await tx.candidateProfile.update({
          where: { id: profile.id },
          data: {
            recommendedGrade,
            candidateCategoryId: categoryId,
            profileStatus: ProfileStatus.AVAILABLE,
          },
        });
      } else {
        await tx.candidateProfile.update({
          where: { id: profile.id },
          data: {
            recommendedGrade: passed ? recommendedGrade : profile.recommendedGrade,
            profileStatus: ProfileStatus.ASSESSMENT_REQUIRED,
          },
        });
      }

      return { updatedAttempt, created };
    });

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.ASSESSMENT_SUBMITTED,
      entityType: 'AssessmentAttempt',
      entityId: attemptId,
      metadata: {
        assessmentId: attempt.assessmentId,
        candidateId: profile.id,
        score: scored.score,
        recommendedGrade,
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: passed ? AuditAction.ASSESSMENT_PASSED : AuditAction.ASSESSMENT_FAILED,
      entityType: 'AssessmentResult',
      entityId: result.created.id,
      metadata: {
        assessmentId: attempt.assessmentId,
        candidateId: profile.id,
        score: scored.score,
        recommendedGrade,
      },
    });

    return {
      attemptId,
      score: scored.score,
      status: resultStatus,
      recommendedGrade,
      selfDeclaredGrade: attempt.selfDeclaredGrade || profile.grade,
      sectionScores: scored.sectionScores,
      correctAnswers: scored.correctAnswers,
      totalQuestions: scored.totalQuestions,
      candidateCategoryId: categoryId,
      profileStatus: passed ? ProfileStatus.AVAILABLE : ProfileStatus.ASSESSMENT_REQUIRED,
      passingScore: attempt.assessment.passingScore,
      result: {
        id: result.created.id,
        score: result.created.score,
        status: result.created.status,
        recommendedGrade: result.created.recommendedGrade,
        selfDeclaredGrade: result.created.selfDeclaredGrade,
        sectionScores: result.created.sectionScores,
        createdAt: result.created.createdAt,
      },
    };
  }

  async myResults(user: AuthUser) {
    this.assertCandidate(user);
    const profile = await this.getCandidateProfile(user);
    const results = await this.prisma.assessmentResult.findMany({
      where: { candidateId: profile.id },
      include: {
        assessment: {
          select: { id: true, name: true, specializationId: true, version: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const categories = await this.prisma.candidateCategory.findMany({
      where: { id: { in: results.map((r) => r.candidateCategoryId).filter(Boolean) as string[] } },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return {
      total: results.length,
      items: results.map((r) => ({
        id: r.id,
        score: r.score,
        status: r.status,
        recommendedGrade: r.recommendedGrade,
        selfDeclaredGrade: r.selfDeclaredGrade,
        sectionScores: r.sectionScores,
        assessmentVersion: r.assessmentVersion,
        createdAt: r.createdAt,
        assessment: r.assessment,
        category: r.candidateCategoryId ? catMap.get(r.candidateCategoryId) || null : null,
      })),
    };
  }

  /** Public summary for employer-facing candidate profile */
  toPublicAssessmentSummary(results: Array<{
    id: string;
    score: number;
    status: AssessmentResultStatus;
    recommendedGrade: Grade;
    createdAt: Date;
    assessment?: { name: string } | null;
  }>) {
    const latest = results[0];
    if (!latest) {
      return { status: 'NOT_TAKEN' as const, latest: null };
    }
    return {
      status: latest.status === AssessmentResultStatus.PASSED ? ('PASSED' as const) : ('FAILED' as const),
      latest: {
        id: latest.id,
        score: latest.score,
        status: latest.status,
        recommendedGrade: latest.recommendedGrade,
        assessmentName: latest.assessment?.name,
        completedAt: latest.createdAt,
      },
    };
  }

  // —— Admin ——
  async adminCreate(dto: AdminCreateAssessmentDto) {
    const assessment = await this.prisma.assessment.create({
      data: {
        name: dto.name,
        description: dto.description,
        industryId: dto.industryId,
        specializationId: dto.specializationId,
        timeLimitSeconds: dto.timeLimitSeconds ?? 1800,
        passingScore: dto.passingScore ?? 50,
        cooldownHours: dto.cooldownHours ?? 72,
        status: AssessmentStatus.DRAFT,
        version: 1,
        blueprints: {
          create: {
            name: `${dto.name} Blueprint`,
            version: 1,
            sections: {
              create: dto.sections.map((s) => ({
                skill: s.skill,
                weight: s.weight,
                questionCount: s.questionCount,
                difficulty: s.difficulty,
                required: s.required ?? true,
              })),
            },
          },
        },
        thresholds: {
          create: dto.thresholds.map((t) => ({
            grade: t.grade,
            minScore: t.minScore,
            maxScore: t.maxScore,
          })),
        },
      },
      include: { blueprints: { include: { sections: true } }, thresholds: true },
    });
    return assessment;
  }

  async adminAddQuestion(assessmentId: string, dto: AdminCreateQuestionDto) {
    const a = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!a) throw new NotFoundException('Assessment не найден');
    return this.prisma.assessmentQuestion.create({
      data: {
        assessmentId,
        skill: dto.skill,
        difficulty: dto.difficulty,
        type: dto.type || 'SINGLE_CHOICE',
        text: dto.text,
        options: dto.options,
        correctOptionIndexes: dto.correctOptionIndexes,
        explanation: dto.explanation,
        points: dto.points ?? 1,
      },
    });
  }

  async adminSetStatus(assessmentId: string, status: AssessmentStatus) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { status },
    });
  }

  async adminList() {
    const items = await this.prisma.assessment.findMany({
      include: {
        specialization: true,
        _count: { select: { questions: true, attempts: true } },
        thresholds: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { total: items.length, items };
  }
}
