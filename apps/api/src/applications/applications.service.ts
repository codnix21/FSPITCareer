import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  Prisma,
  ProfileStatus,
  UserRole,
  VacancyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditService } from '../privacy/audit.service';
import { ContactRevealService } from '../privacy/contact-reveal.service';
import { toPublicCandidateProfile } from '../privacy/candidate-privacy';
import { CreateApplicationDto, ReviewApplicationDto } from './dto/application.dto';

type AuthUser = { id: string; role: UserRole };

const ACTIVE_STATUSES: ApplicationStatus[] = [ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING];

const EMPLOYER_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.SUBMITTED]: [
    ApplicationStatus.REVIEWING,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.REVIEWING]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

const CANDIDATE_WITHDRAW_FROM: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.REVIEWING,
];

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private contacts: ContactRevealService,
  ) {}

  private async getCandidateProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    return profile;
  }

  private async assertEmployerOwnsVacancy(vacancyId: string, employerUserId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const company = await this.prisma.company.findUnique({ where: { userId: employerUserId } });
    if (!company) throw new ForbiddenException('Профиль компании не найден');
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('Вакансия не найдена');
    if (vacancy.companyId !== company.id) {
      throw new ForbiddenException('Нет доступа к откликам этой вакансии');
    }
    return { company, vacancy };
  }

  private toCandidateDto(app: any) {
    return {
      id: app.id,
      vacancyId: app.vacancyId,
      status: app.status,
      coverLetter: app.coverLetter,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      reviewedAt: app.reviewedAt,
      withdrawnAt: app.withdrawnAt,
      vacancy: app.vacancy
        ? {
            id: app.vacancy.id,
            title: app.vacancy.title,
            status: app.vacancy.status,
            grade: app.vacancy.grade,
            company: app.vacancy.company
              ? { id: app.vacancy.company.id, name: app.vacancy.company.name }
              : null,
          }
        : null,
    };
  }

  private async toEmployerDto(app: any, employerUserId: string, role: UserRole, opts?: { auditReveal?: boolean }) {
    const profile = app.candidate
      ? toPublicCandidateProfile({
          ...app.candidate,
          user: app.candidate.user,
          assessmentResults: app.candidate.assessmentResults,
          achievements: app.candidate.achievements,
        })
      : null;

    let contact: { email: string; phone: string | null; reason: string } | null = null;
    let contactAllowed = false;
    if (profile && (role === UserRole.EMPLOYER || role === UserRole.ADMIN)) {
      try {
        if (opts?.auditReveal) {
          const revealed = await this.contacts.revealCandidateContact(
            { id: employerUserId, role },
            profile.id,
          );
          contactAllowed = true;
          contact = { email: revealed.email, phone: revealed.phone, reason: revealed.reason };
        } else {
          const check = await this.contacts.canRevealCandidateContact(employerUserId, profile.id);
          contactAllowed = check.allowed || role === UserRole.ADMIN;
          if (contactAllowed) {
            const u = await this.prisma.user.findUnique({
              where: { id: profile.userId },
              select: { email: true, phone: true },
            });
            if (u) {
              contact = {
                email: u.email,
                phone: u.phone,
                reason: check.reason || (role === UserRole.ADMIN ? 'ADMIN' : 'SELF_APPLICATION'),
              };
            }
          }
        }
      } catch {
        contactAllowed = false;
        contact = null;
      }
    }

    const latestAssessment = app.candidate?.assessmentResults?.[0];
    const match = app.vacancy
      ? await this.prisma.match.findUnique({
          where: {
            candidateId_vacancyId: { candidateId: app.candidateId, vacancyId: app.vacancyId },
          },
        }).catch(() => null)
      : null;

    return {
      id: app.id,
      vacancyId: app.vacancyId,
      status: app.status,
      coverLetter: app.coverLetter,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      reviewedAt: app.reviewedAt,
      withdrawnAt: app.withdrawnAt,
      candidate: profile
        ? {
            id: profile.id,
            userId: profile.userId,
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
            roleTitle: profile.roleTitle,
            grade: profile.grade,
            recommendedGrade: profile.recommendedGrade,
            experienceYears: profile.experienceYears,
            workFormat: profile.workFormat,
            city: profile.city,
            specialization: profile.specialization,
            candidateCategory: profile.candidateCategory,
            skills: profile.skills,
            assessment: profile.assessment,
            achievementsCount: (profile.achievements || []).length,
            fspSummary: {
              count: (profile.achievements || []).length,
              hasDemo: (profile.achievements || []).some((a: any) => a.isDemo || a.sourceType === 'DEMO'),
            },
          }
        : null,
      matchingSummary: match
        ? { matchScore: match.score, reasons: match.reasons, breakdown: match.breakdown }
        : null,
      assessmentSummary: latestAssessment
        ? {
            score: latestAssessment.score,
            status: latestAssessment.status,
            recommendedGrade: latestAssessment.recommendedGrade,
          }
        : null,
      contact: contactAllowed && contact
        ? { email: contact.email, phone: contact.phone, reason: contact.reason }
        : null,
      contactAllowed,
    };
  }

  async create(dto: CreateApplicationDto, user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Только соискатель может откликаться на вакансии');
    }

    const profile = await this.getCandidateProfile(user.id);
    if (profile.profileStatus !== ProfileStatus.AVAILABLE) {
      throw new ForbiddenException({
        code: 'PROFILE_NOT_AVAILABLE',
        message: 'Отклик доступен после прохождения технического тестирования',
      });
    }

    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: dto.vacancyId },
      include: { company: true },
    });
    if (!vacancy) throw new NotFoundException('Вакансия не найдена');
    if (vacancy.status !== VacancyStatus.ACTIVE) {
      throw new BadRequestException('Вакансия недоступна для отклика');
    }
    if (vacancy.company.userId === user.id) {
      throw new BadRequestException('Нельзя откликнуться на собственную вакансию');
    }

    const active = await this.prisma.application.findFirst({
      where: {
        candidateId: profile.id,
        vacancyId: vacancy.id,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (active) {
      throw new ConflictException({
        code: 'APPLICATION_DUPLICATE',
        message: 'Активный отклик на эту вакансию уже существует',
        applicationId: active.id,
      });
    }

    try {
      const created = await this.prisma.application.create({
        data: {
          candidateId: profile.id,
          vacancyId: vacancy.id,
          coverLetter: dto.coverLetter?.trim() || null,
          status: ApplicationStatus.SUBMITTED,
        },
        include: {
          vacancy: { include: { company: { select: { id: true, name: true } } } },
        },
      });

      await this.audit.log({
        actorUserId: user.id,
        action: AuditAction.APPLICATION_CREATED,
        entityType: 'Application',
        entityId: created.id,
        metadata: {
          applicationId: created.id,
          vacancyId: vacancy.id,
          candidateId: profile.id,
        },
      });

      return this.toCandidateDto(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          code: 'APPLICATION_DUPLICATE',
          message: 'Активный отклик на эту вакансию уже существует',
        });
      }
      throw e;
    }
  }

  async myApplications(user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно только соискателю');
    }
    const profile = await this.getCandidateProfile(user.id);
    const items = await this.prisma.application.findMany({
      where: { candidateId: profile.id },
      include: {
        vacancy: { include: { company: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { total: items.length, items: items.map((a) => this.toCandidateDto(a)) };
  }

  async findOne(id: string, user: AuthUser) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        vacancy: { include: { company: true } },
        candidate: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            industry: true,
            specialization: true,
            candidateCategory: true,
            skills: { include: { skill: true } },
            achievements: true,
            assessmentResults: {
              include: { assessment: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!app) throw new NotFoundException('Отклик не найден');

    if (user.role === UserRole.ADMIN) {
      return this.toEmployerDto(app, user.id, user.role, { auditReveal: true });
    }

    if (user.role === UserRole.CANDIDATE) {
      const profile = await this.getCandidateProfile(user.id);
      if (app.candidateId !== profile.id) throw new ForbiddenException('Нет доступа к этому отклику');
      return this.toCandidateDto(app);
    }

    if (user.role === UserRole.EMPLOYER) {
      await this.assertEmployerOwnsVacancy(app.vacancyId, user.id, user.role);
      return this.toEmployerDto(app, user.id, user.role, { auditReveal: true });
    }

    throw new ForbiddenException('Недостаточно прав');
  }

  async withdraw(id: string, user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Только соискатель может отозвать отклик');
    }
    const profile = await this.getCandidateProfile(user.id);
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Отклик не найден');
    if (user.role !== UserRole.ADMIN && app.candidateId !== profile.id) {
      throw new ForbiddenException('Нет доступа к этому отклику');
    }
    if (!CANDIDATE_WITHDRAW_FROM.includes(app.status)) {
      throw new BadRequestException(`Нельзя отозвать отклик в статусе ${app.status}`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.WITHDRAWN, withdrawnAt: new Date() },
      include: {
        vacancy: { include: { company: { select: { id: true, name: true } } } },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.APPLICATION_WITHDRAWN,
      entityType: 'Application',
      entityId: id,
      metadata: {
        applicationId: id,
        vacancyId: app.vacancyId,
        candidateId: app.candidateId,
        from: app.status,
        to: ApplicationStatus.WITHDRAWN,
      },
    });

    return this.toCandidateDto(updated);
  }

  async listForVacancy(vacancyId: string, user: AuthUser) {
    if (user.role !== UserRole.EMPLOYER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно работодателю');
    }
    await this.assertEmployerOwnsVacancy(vacancyId, user.id, user.role);

    const items = await this.prisma.application.findMany({
      where: { vacancyId },
      include: {
        vacancy: { include: { company: true } },
        candidate: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            industry: true,
            specialization: true,
            candidateCategory: true,
            skills: { include: { skill: true } },
            achievements: true,
            assessmentResults: {
              include: { assessment: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = await Promise.all(items.map((a) => this.toEmployerDto(a, user.id, user.role)));
    return { total: mapped.length, items: mapped };
  }

  async employerReview(id: string, dto: ReviewApplicationDto, user: AuthUser) {
    if (user.role !== UserRole.EMPLOYER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно работодателю');
    }

    const next = dto.status;
    if (
      next !== ApplicationStatus.REVIEWING &&
      next !== ApplicationStatus.ACCEPTED &&
      next !== ApplicationStatus.REJECTED
    ) {
      throw new BadRequestException('Недопустимый статус для работодателя');
    }

    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Отклик не найден');
    await this.assertEmployerOwnsVacancy(app.vacancyId, user.id, user.role);

    const allowed = EMPLOYER_TRANSITIONS[app.status] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Переход ${app.status} → ${next} запрещён`);
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: next,
        reviewedAt: new Date(),
      },
      include: {
        vacancy: { include: { company: true } },
        candidate: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            industry: true,
            specialization: true,
            candidateCategory: true,
            skills: { include: { skill: true } },
            achievements: true,
            assessmentResults: {
              include: { assessment: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const action =
      next === ApplicationStatus.ACCEPTED
        ? AuditAction.APPLICATION_ACCEPTED
        : next === ApplicationStatus.REJECTED
          ? AuditAction.APPLICATION_REJECTED
          : AuditAction.APPLICATION_REVIEWED;

    await this.audit.log({
      actorUserId: user.id,
      action,
      entityType: 'Application',
      entityId: id,
      metadata: {
        applicationId: id,
        vacancyId: app.vacancyId,
        candidateId: app.candidateId,
        from: app.status,
        to: next,
      },
    });
    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.APPLICATION_STATUS_CHANGED,
      entityType: 'Application',
      entityId: id,
      metadata: {
        applicationId: id,
        vacancyId: app.vacancyId,
        candidateId: app.candidateId,
        from: app.status,
        to: next,
      },
    });

    return this.toEmployerDto(updated, user.id, user.role);
  }

  async myApplicationForVacancy(vacancyId: string, user: AuthUser) {
    if (user.role !== UserRole.CANDIDATE) return { application: null };
    const profile = await this.getCandidateProfile(user.id);
    const app = await this.prisma.application.findFirst({
      where: { candidateId: profile.id, vacancyId },
      include: {
        vacancy: { include: { company: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { application: app ? this.toCandidateDto(app) : null };
  }
}
