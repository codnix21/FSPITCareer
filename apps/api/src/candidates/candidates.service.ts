import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateDto } from './dto/candidate.dto';
import { Grade, OfferStatus, ProfileStatus, UserRole } from '@prisma/client';
import { SkillPersistenceService } from '../reference/skill-persistence.service';
import { toOwnCandidateProfile, toPublicCandidateProfile } from '../privacy/candidate-privacy';
import { ContactRevealService } from '../privacy/contact-reveal.service';
import { AuditAction, AuditService } from '../privacy/audit.service';
import { CandidateCategoryService } from '../taxonomy/candidate-category.service';
import { EmailVerificationService } from '../email/email-verification.service';
import { FspService } from '../fsp/fsp.service';

const candidateInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, emailVerified: true } },
  industry: true,
  specialization: true,
  candidateCategory: true,
  skills: { include: { skill: true } },
  experiences: { orderBy: { startDate: 'desc' as const } },
  educations: true,
  achievements: { orderBy: { year: 'desc' as const } },
  testAttempts: { include: { test: true }, orderBy: { completedAt: 'desc' as const } },
  assessmentResults: {
    include: { assessment: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
  challengeAttempts: {
    where: { status: 'SUBMITTED' as const },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          specialization: { select: { id: true, name: true } },
          skill: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' as const },
    take: 10,
  },
  resumes: { include: { analysis: true }, orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class CandidatesService {
  constructor(
    private prisma: PrismaService,
    private skills: SkillPersistenceService,
    private contacts: ContactRevealService,
    private audit: AuditService,
    private categories: CandidateCategoryService,
    private emailVerification: EmailVerificationService,
    private fsp: FspService,
  ) {}

  async findAll(
    query: {
      roleTitle?: string;
      grade?: string;
      workFormat?: string;
      skill?: string;
      hasFsp?: string;
      experienceFrom?: string;
      salaryFrom?: string;
      salaryTo?: string;
      specializationId?: string;
      industryId?: string;
    },
    requester: { id: string; role: UserRole },
  ) {
    if (requester.role !== UserRole.EMPLOYER && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const where: any = {};
    // Employers only see profiles ready for hiring (AVAILABLE)
    if (requester.role === UserRole.EMPLOYER) {
      where.profileStatus = ProfileStatus.AVAILABLE;
    }
    if (query?.roleTitle) where.roleTitle = { contains: query.roleTitle, mode: 'insensitive' };
    if (query?.grade) where.grade = query.grade;
    if (query?.workFormat) where.workFormat = query.workFormat;
    if (query?.specializationId) where.specializationId = query.specializationId;
    if (query?.industryId) where.industryId = query.industryId;
    if (query?.experienceFrom) where.experienceYears = { gte: Number(query.experienceFrom) };
    if (query?.salaryFrom || query?.salaryTo) {
      where.AND = where.AND || [];
      if (query.salaryFrom) where.AND.push({ salaryTo: { gte: Number(query.salaryFrom) } });
      if (query.salaryTo) where.AND.push({ salaryFrom: { lte: Number(query.salaryTo) } });
    }
    if (query?.skill) {
      where.skills = { some: { skill: { name: { equals: query.skill, mode: 'insensitive' } } } };
    }
    if (query?.hasFsp === 'true') {
      where.achievements = { some: {} };
    }

    const items = await this.prisma.candidateProfile.findMany({
      where,
      include: candidateInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      total: items.length,
      items: items.map((item) =>
        requester.role === UserRole.ADMIN ? toOwnCandidateProfile(item) : toPublicCandidateProfile(item),
      ),
    };
  }

  async findOneForViewer(id: string, requester: { id: string; role: UserRole }) {
    const item = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: candidateInclude,
    });
    if (!item) throw new NotFoundException('Профиль не найден');

    const isOwner = item.userId === requester.id;
    const isAdmin = requester.role === UserRole.ADMIN;

    if (isOwner || isAdmin) {
      await this.audit.log({
        actorUserId: requester.id,
        action: AuditAction.PROFILE_VIEWED,
        entityType: 'CandidateProfile',
        entityId: id,
        metadata: { mode: 'own_or_admin' },
      });
      return toOwnCandidateProfile(item);
    }

    if (requester.role === UserRole.EMPLOYER) {
      if (item.profileStatus !== ProfileStatus.AVAILABLE) {
        throw new NotFoundException('Профиль не найден');
      }
      await this.audit.log({
        actorUserId: requester.id,
        action: AuditAction.PROFILE_VIEWED,
        entityType: 'CandidateProfile',
        entityId: id,
        metadata: { mode: 'public' },
      });
      return toPublicCandidateProfile(item);
    }

    throw new ForbiddenException('Недостаточно прав');
  }

  async findByUserId(userId: string) {
    const item = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: candidateInclude,
    });
    if (!item) throw new NotFoundException('Профиль кандидата не найден');
    return toOwnCandidateProfile(item);
  }

  async getCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidateProfile: {
          include: {
            skills: true,
            assessmentResults: { where: { status: 'PASSED' }, take: 1 },
          },
        },
      },
    });
    if (!user?.candidateProfile) throw new NotFoundException('Профиль кандидата не найден');
    const p = user.candidateProfile;
    const steps = {
      emailVerification: !!user.emailVerified,
      industry: !!p.industryId,
      specialization: !!p.specializationId,
      grade: !!p.grade,
      skills: (p.skills?.length || 0) > 0,
      assessment: (p.assessmentResults?.length || 0) > 0,
      category: !!p.candidateCategoryId && !!p.recommendedGrade,
    };
    const completed =
      steps.emailVerification &&
      steps.industry &&
      steps.specialization &&
      steps.grade &&
      steps.skills &&
      steps.assessment &&
      steps.category &&
      p.profileStatus === ProfileStatus.AVAILABLE;

    return {
      completed,
      profileStatus: p.profileStatus,
      steps,
      nextStep: !steps.emailVerification
        ? 'emailVerification'
        : !steps.industry
          ? 'industry'
          : !steps.specialization
            ? 'specialization'
            : !steps.grade
              ? 'grade'
              : !steps.skills
                ? 'skills'
                : !steps.assessment
                  ? 'assessment'
                  : 'done',
    };
  }

  async getContact(id: string, requester: { id: string; role: UserRole }) {
    return this.contacts.revealCandidateContact(requester, id);
  }

  async update(id: string, dto: UpdateCandidateDto, requester: { id: string; role: UserRole; emailVerified?: boolean }) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: { user: true, skills: true },
    });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    if (requester.role !== UserRole.ADMIN && profile.userId !== requester.id) {
      throw new ForbiddenException('Нельзя редактировать чужой профиль');
    }

    // Product gate: email must be verified for candidate self-service updates
    if (requester.role === UserRole.CANDIDATE) {
      const verified = requester.emailVerified ?? profile.user.emailVerified;
      this.emailVerification.assertVerified({ emailVerified: verified });
    }

    const { skills, experiences, educations, isVerified: _ignoreVerified, ...raw } = dto as UpdateCandidateDto & {
      isVerified?: boolean;
    };

    const nextGrade = (raw.grade ?? profile.grade) as Grade;
    const nextIndustryId = raw.industryId !== undefined ? raw.industryId : profile.industryId;
    const nextSpecializationId =
      raw.specializationId !== undefined ? raw.specializationId : profile.specializationId;

    await this.categories.validateCategoryCombination({
      industryId: nextIndustryId,
      specializationId: nextSpecializationId,
      candidateCategoryId: raw.candidateCategoryId,
      grade: nextGrade,
    });

    let categoryId = profile.candidateCategoryId;
    let roleTitle = raw.roleTitle ?? profile.roleTitle;

    if (nextSpecializationId) {
      const { category, specialization } = await this.categories.resolveCategory(nextSpecializationId, nextGrade);
      categoryId = category.id;
      // Keep display title aligned with specialization unless custom roleTitle provided
      if (!raw.roleTitle) roleTitle = specialization.name;
    }

    if (skills) {
      await this.prisma.candidateSkill.deleteMany({ where: { candidateId: id } });
      for (const s of skills) {
        const skill = await this.skills.ensureSkill({
          name: s.name,
          externalSource: s.externalSource,
          externalId: s.externalId,
        });
        await this.prisma.candidateSkill.create({
          data: { candidateId: id, skillId: skill.id, level: s.level ?? 3 },
        });
      }
    }

    if (experiences) {
      await this.prisma.experience.deleteMany({ where: { candidateId: id } });
      for (const exp of experiences) {
        await this.prisma.experience.create({
          data: {
            candidateId: id,
            company: exp.company,
            position: exp.position,
            description: exp.description,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent ?? !exp.endDate,
          },
        });
      }
    }

    if (educations) {
      await this.prisma.education.deleteMany({ where: { candidateId: id } });
      for (const ed of educations) {
        await this.prisma.education.create({
          data: {
            candidateId: id,
            institution: ed.institution,
            degree: ed.degree,
            field: ed.field,
            yearFrom: ed.yearFrom,
            yearTo: ed.yearTo,
          },
        });
      }
    }

    const skillCount = skills
      ? skills.length
      : await this.prisma.candidateSkill.count({ where: { candidateId: id } });

    let profileStatus = profile.profileStatus;
    const onboardingCompleted = raw.onboardingCompleted ?? profile.onboardingCompleted;

    // Never auto-promote to AVAILABLE in Wave B (assessment is Wave C)
    if (profileStatus === ProfileStatus.AVAILABLE) {
      // keep AVAILABLE for legacy seed profiles that already earned it
    } else if (nextIndustryId && nextSpecializationId && nextGrade && skillCount > 0 && onboardingCompleted) {
      profileStatus = ProfileStatus.ASSESSMENT_REQUIRED;
    } else if (nextIndustryId || nextSpecializationId || skillCount > 0) {
      profileStatus = ProfileStatus.DRAFT;
    }

    const updated = await this.prisma.candidateProfile.update({
      where: { id },
      data: {
        roleTitle,
        grade: nextGrade,
        experienceYears: raw.experienceYears ?? profile.experienceYears,
        salaryFrom: raw.salaryFrom !== undefined ? raw.salaryFrom : profile.salaryFrom,
        salaryTo: raw.salaryTo !== undefined ? raw.salaryTo : profile.salaryTo,
        workFormat: raw.workFormat ?? profile.workFormat,
        about: raw.about !== undefined ? raw.about : profile.about,
        city: raw.city !== undefined ? raw.city : profile.city,
        fspParticipantId: raw.fspParticipantId !== undefined ? raw.fspParticipantId : profile.fspParticipantId,
        onboardingCompleted,
        industryId: nextIndustryId,
        specializationId: nextSpecializationId,
        candidateCategoryId: categoryId,
        profileStatus,
      },
      include: candidateInclude,
    });

    await this.audit.log({
      actorUserId: requester.id,
      action: AuditAction.PROFILE_UPDATED,
      entityType: 'CandidateProfile',
      entityId: id,
      metadata: { profileStatus },
    });

    return toOwnCandidateProfile(updated);
  }

  async syncFspAchievements(id: string, requester: { id: string; role: UserRole; emailVerified?: boolean }) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: { ...candidateInclude, user: true },
    });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    if (requester.role !== UserRole.ADMIN && profile.userId !== requester.id) {
      throw new ForbiddenException('Нет доступа');
    }
    if (requester.role === UserRole.CANDIDATE) {
      this.emailVerification.assertVerified({
        emailVerified: requester.emailVerified ?? profile.user.emailVerified,
      });
    }
    if (!profile.fspParticipantId) {
      throw new NotFoundException('К профилю не привязан участник ФСП');
    }

    await this.fsp.syncToCandidateProfile({
      candidateProfileId: id,
      fspParticipantId: profile.fspParticipantId,
      actorUserId: requester.id,
    });

    const refreshed = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: candidateInclude,
    });
    return toOwnCandidateProfile(refreshed!);
  }

  async getAchievements(id: string, requester: { id: string; role: UserRole }) {
    await this.findOneForViewer(id, requester);
    const items = await this.prisma.fspAchievement.findMany({
      where: { candidateId: id },
      orderBy: { year: 'desc' },
    });
    return items.map((a) => ({
      id: a.id,
      title: a.title,
      discipline: a.discipline,
      place: a.place,
      year: a.year,
      status: a.status,
      isDemo: a.isDemo || a.source === 'DEMO',
      source: a.source,
      sourceType: a.source === 'FSP' && !a.isDemo ? 'FSP' : 'DEMO',
    }));
  }

  async hasAcceptedOfferWithEmployer(candidateUserId: string, employerUserId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: {
        candidateId: candidateUserId,
        employerId: employerUserId,
        status: OfferStatus.ACCEPTED,
      },
    });
    return !!offer;
  }
}
