import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateDto } from './dto/candidate.dto';
import { UserRole } from '@prisma/client';

const candidateInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  skills: { include: { skill: true } },
  experiences: { orderBy: { startDate: 'desc' as const } },
  educations: true,
  achievements: { orderBy: { year: 'desc' as const } },
  testAttempts: { include: { test: true }, orderBy: { completedAt: 'desc' as const } },
  resumes: { include: { analysis: true }, orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    roleTitle?: string;
    grade?: string;
    workFormat?: string;
    skill?: string;
    hasFsp?: string;
    experienceFrom?: string;
    salaryFrom?: string;
    salaryTo?: string;
  }) {
    const where: any = {};
    if (query?.roleTitle) where.roleTitle = { contains: query.roleTitle, mode: 'insensitive' };
    if (query?.grade) where.grade = query.grade;
    if (query?.workFormat) where.workFormat = query.workFormat;
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
    return { total: items.length, items };
  }

  async findOne(id: string) {
    const item = await this.prisma.candidateProfile.findUnique({
      where: { id },
      include: candidateInclude,
    });
    if (!item) throw new NotFoundException('Профиль кандидата не найден');
    return item;
  }

  async findByUserId(userId: string) {
    const item = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: candidateInclude,
    });
    if (!item) throw new NotFoundException('Профиль кандидата не найден');
    return item;
  }

  async update(id: string, dto: UpdateCandidateDto, requester: { id: string; role: UserRole }) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    if (requester.role !== UserRole.ADMIN && profile.userId !== requester.id) {
      throw new ForbiddenException('Нельзя редактировать чужой профиль');
    }

    const { skills, experiences, educations, ...data } = dto;

    if (skills) {
      await this.prisma.candidateSkill.deleteMany({ where: { candidateId: id } });
      for (const s of skills) {
        const skill = await this.prisma.skill.upsert({
          where: { name: s.name },
          create: { name: s.name },
          update: {},
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

    return this.prisma.candidateProfile.update({
      where: { id },
      data,
      include: candidateInclude,
    });
  }

  async syncFspAchievements(id: string, requester: { id: string; role: UserRole }) {
    const profile = await this.findOne(id);
    if (requester.role !== UserRole.ADMIN && profile.userId !== requester.id) {
      throw new ForbiddenException('Нет доступа');
    }
    if (!profile.fspParticipantId) {
      throw new NotFoundException('К профилю не привязан участник ФСП');
    }

    const participant = await this.prisma.fspParticipant.findFirst({
      where: { OR: [{ externalId: profile.fspParticipantId }, { id: profile.fspParticipantId }] },
      include: { results: { include: { competition: { include: { discipline: true } } } } },
    });
    if (!participant) throw new NotFoundException('Участник ФСП не найден');

    await this.prisma.fspAchievement.deleteMany({ where: { candidateId: id, isDemo: true } });
    for (const r of participant.results) {
      await this.prisma.fspAchievement.create({
        data: {
          candidateId: id,
          title: r.competition.name,
          discipline: r.competition.discipline?.name || 'Программирование',
          place: r.place,
          year: r.competition.year,
          status: r.status,
          isDemo: participant.isDemo,
        },
      });
    }

    return this.getAchievements(id);
  }

  async getAchievements(id: string) {
    await this.findOne(id);
    return this.prisma.fspAchievement.findMany({
      where: { candidateId: id },
      orderBy: { year: 'desc' },
    });
  }
}
