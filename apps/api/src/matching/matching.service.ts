import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateMatch, MatchVacancyInput } from './matching.engine';
import { SearchCandidatesDto, SemanticMatchDto } from './dto/search.dto';
import { Grade, UserRole, WorkFormat } from '@prisma/client';
import { toMatchingCandidateItem } from '../privacy/candidate-privacy';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  private async assertEmployerOwnsVacancy(vacancyId: string, user: AuthUser) {
    if (user.role === UserRole.ADMIN) return;
    const company = await this.prisma.company.findUnique({ where: { userId: user.id } });
    if (!company) throw new ForbiddenException('Профиль компании не найден');
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('Вакансия не найдена');
    if (vacancy.companyId !== company.id) {
      throw new ForbiddenException('Нет доступа к этой вакансии');
    }
  }

  async search(dto: SearchCandidatesDto, user: AuthUser & { emailVerified?: boolean }) {
    if (user.role !== UserRole.EMPLOYER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Поиск специалистов доступен работодателю');
    }
    if (user.role === UserRole.EMPLOYER && user.emailVerified === false) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Подтвердите email, чтобы продолжить',
      });
    }

    if (dto.vacancyId) {
      await this.assertEmployerOwnsVacancy(dto.vacancyId, user);
    }

    const candidates = await this.prisma.candidateProfile.findMany({
      where: { profileStatus: 'AVAILABLE' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        skills: { include: { skill: true } },
        achievements: true,
        specialization: true,
        assessmentResults: {
          where: { status: 'PASSED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    let vacancySpecializationSlug: string | null = null;
    if (dto.specializationId) {
      const spec = await this.prisma.specialization.findUnique({ where: { id: dto.specializationId } });
      vacancySpecializationSlug = spec?.slug ?? null;
    }

    const vacancyInput: MatchVacancyInput = {
      roleTitle: dto.roleTitle,
      grade: dto.grade,
      experienceFrom: dto.experienceFrom ?? 0,
      experienceTo: dto.experienceTo,
      salaryFrom: dto.salaryFrom,
      salaryTo: dto.salaryTo,
      workFormat: dto.workFormat ?? WorkFormat.REMOTE,
      skills: dto.technologies,
      specializationId: dto.specializationId,
      specializationSlug: vacancySpecializationSlug,
    };

    let results = candidates.map((c) => {
      const latestAssessment = c.assessmentResults[0];
      const match = calculateMatch(
        {
          id: c.id,
          roleTitle: c.roleTitle,
          grade: c.grade,
          recommendedGrade: c.recommendedGrade,
          experienceYears: c.experienceYears,
          salaryFrom: c.salaryFrom,
          salaryTo: c.salaryTo,
          workFormat: c.workFormat,
          skills: c.skills.map((s) => s.skill.name),
          fspAchievementsCount: c.achievements.length,
          specializationId: c.specializationId,
          specializationSlug: c.specialization?.slug,
          assessmentScore: latestAssessment?.score ?? null,
        },
        vacancyInput,
      );

      return toMatchingCandidateItem({
        id: c.id,
        userId: c.userId,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        roleTitle: c.roleTitle,
        grade: c.grade,
        experienceYears: c.experienceYears,
        salaryFrom: c.salaryFrom,
        salaryTo: c.salaryTo,
        workFormat: c.workFormat,
        isVerified: c.isVerified,
        skills: c.skills.map((s) => ({ name: s.skill.name, level: s.level })),
        achievementsCount: c.achievements.length,
        matchScore: match.score,
        matchBreakdown: match.breakdown,
        reasons: match.reasons,
      });
    });

    if (dto.hasFspAchievements) {
      results = results.filter((r) => r.achievementsCount > 0);
    }

    results = results.filter((r) => {
      const b = r.matchBreakdown as any;
      const taxonomyOk = b.specializationMatch >= 0.5 || b.roleMatch >= 0.5;
      return taxonomyOk && r.matchScore >= 45;
    });

    switch (dto.sortBy) {
      case 'experience':
        results.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      case 'achievements':
        results.sort((a, b) => b.achievementsCount - a.achievementsCount || b.matchScore - a.matchScore);
        break;
      case 'salary':
        results.sort((a, b) => (a.salaryFrom ?? 0) - (b.salaryFrom ?? 0));
        break;
      default:
        results.sort((a, b) => b.matchScore - a.matchScore);
    }

    if (dto.vacancyId) {
      await Promise.all(
        results.slice(0, 50).map((r) =>
          this.prisma.match.upsert({
            where: { candidateId_vacancyId: { candidateId: r.id, vacancyId: dto.vacancyId! } },
            create: {
              candidateId: r.id,
              vacancyId: dto.vacancyId!,
              score: r.matchScore,
              breakdown: r.matchBreakdown as any,
              reasons: r.reasons,
            },
            update: {
              score: r.matchScore,
              breakdown: r.matchBreakdown as any,
              reasons: r.reasons,
            },
          }),
        ),
      );
    }

    return {
      total: results.length,
      items: results,
    };
  }

  async matchForVacancy(vacancyId: string, user: AuthUser) {
    await this.assertEmployerOwnsVacancy(vacancyId, user);

    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { skills: { include: { skill: true } } },
    });
    if (!vacancy) return { total: 0, items: [] };

    return this.search(
      {
        roleTitle: vacancy.roleTitle,
        grade: vacancy.grade,
        specializationId: vacancy.specializationId ?? undefined,
        technologies: vacancy.skills.map((s) => s.skill.name),
        experienceFrom: vacancy.experienceFrom,
        experienceTo: vacancy.experienceTo ?? undefined,
        salaryFrom: vacancy.salaryFrom ?? undefined,
        salaryTo: vacancy.salaryTo ?? undefined,
        workFormat: vacancy.workFormat,
        vacancyId,
        sortBy: 'match',
      },
      user,
    );
  }

  async semantic(dto: SemanticMatchDto, user?: AuthUser) {
    if (!user) {
      throw new ForbiddenException('Требуется авторизация');
    }

    if (user.role === UserRole.EMPLOYER || user.role === UserRole.ADMIN) {
      await this.assertEmployerOwnsVacancy(dto.vacancy_id, user);
    } else if (user.role === UserRole.CANDIDATE) {
      const profile = await this.prisma.candidateProfile.findUnique({ where: { userId: user.id } });
      if (!profile || profile.id !== dto.candidate_id) {
        throw new ForbiddenException('Нет доступа к этому кандидату');
      }
    } else {
      throw new ForbiddenException('Недостаточно прав');
    }

    return this.semanticCompute(dto);
  }

  private async semanticCompute(dto: SemanticMatchDto) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: dto.candidate_id },
      include: {
        skills: { include: { skill: true } },
        achievements: true,
        specialization: true,
        assessmentResults: { where: { status: 'PASSED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: dto.vacancy_id },
      include: { skills: { include: { skill: true } }, specialization: true },
    });

    const mlUrl = process.env.ML_SERVICE_URL;
    if (mlUrl && candidate && vacancy) {
      try {
        const candidateText = [
          candidate.roleTitle,
          candidate.grade,
          candidate.about || '',
          ...candidate.skills.map((s) => s.skill.name),
        ].join(' ');
        const vacancyText = [
          vacancy.roleTitle,
          vacancy.title,
          vacancy.grade,
          vacancy.description || '',
          vacancy.requirements || '',
          ...vacancy.skills.map((s) => s.skill.name),
        ].join(' ');

        const textRes = await fetch(`${mlUrl}/api/v1/matching/semantic-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_text: candidateText, vacancy_text: vacancyText }),
        });
        if (textRes.ok) return textRes.json();

        const res = await fetch(`${mlUrl}/api/v1/matching/semantic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dto),
        });
        if (res.ok) return res.json();
      } catch {
        // fallback below
      }
    }

    if (!candidate || !vacancy) {
      return { similarity: 0, source: 'fallback' };
    }

    const match = calculateMatch(
      {
        id: candidate.id,
        roleTitle: candidate.roleTitle,
        grade: candidate.grade as Grade,
        recommendedGrade: candidate.recommendedGrade as Grade | null,
        experienceYears: candidate.experienceYears,
        salaryFrom: candidate.salaryFrom,
        salaryTo: candidate.salaryTo,
        workFormat: candidate.workFormat as WorkFormat,
        skills: candidate.skills.map((s) => s.skill.name),
        fspAchievementsCount: candidate.achievements.length,
        specializationId: candidate.specializationId,
        specializationSlug: candidate.specialization?.slug,
        assessmentScore: candidate.assessmentResults[0]?.score ?? null,
      },
      {
        roleTitle: vacancy.roleTitle,
        grade: vacancy.grade as Grade,
        experienceFrom: vacancy.experienceFrom,
        experienceTo: vacancy.experienceTo,
        salaryFrom: vacancy.salaryFrom,
        salaryTo: vacancy.salaryTo,
        workFormat: vacancy.workFormat as WorkFormat,
        skills: vacancy.skills.map((s) => s.skill.name),
        specializationId: vacancy.specializationId,
        specializationSlug: vacancy.specialization?.slug,
      },
    );

    return {
      similarity: Math.round((match.score / 100) * 100) / 100,
      source: 'deterministic_fallback',
    };
  }

  async matchCandidateToVacancies(candidateId: string, user: AuthUser) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { id: candidateId } });
    if (!profile) throw new NotFoundException('Профиль не найден');

    if (user.role === UserRole.CANDIDATE && profile.userId !== user.id) {
      throw new ForbiddenException('Нет доступа');
    }
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN && user.role !== UserRole.EMPLOYER) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        skills: { include: { skill: true } },
        achievements: true,
        specialization: true,
        assessmentResults: { where: { status: 'PASSED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!candidate) return { total: 0, items: [] };

    const vacancies = await this.prisma.vacancy.findMany({
      where: { status: 'ACTIVE' },
      include: {
        skills: { include: { skill: true } },
        company: true,
        specialization: true,
      },
    });

    const items = vacancies
      .map((v) => {
        const match = calculateMatch(
          {
            id: candidate.id,
            roleTitle: candidate.roleTitle,
            grade: candidate.grade,
            recommendedGrade: candidate.recommendedGrade,
            experienceYears: candidate.experienceYears,
            salaryFrom: candidate.salaryFrom,
            salaryTo: candidate.salaryTo,
            workFormat: candidate.workFormat,
            skills: candidate.skills.map((s) => s.skill.name),
            fspAchievementsCount: candidate.achievements.length,
            specializationId: candidate.specializationId,
            specializationSlug: candidate.specialization?.slug,
            assessmentScore: candidate.assessmentResults[0]?.score ?? null,
          },
          {
            roleTitle: v.roleTitle,
            grade: v.grade,
            experienceFrom: v.experienceFrom,
            experienceTo: v.experienceTo,
            salaryFrom: v.salaryFrom,
            salaryTo: v.salaryTo,
            workFormat: v.workFormat,
            skills: v.skills.map((s) => s.skill.name),
            specializationId: v.specializationId,
            specializationSlug: v.specialization?.slug,
          },
        );
        return {
          id: v.id,
          title: v.title,
          roleTitle: v.roleTitle,
          grade: v.grade,
          salaryFrom: v.salaryFrom,
          salaryTo: v.salaryTo,
          workFormat: v.workFormat,
          companyName: v.company.name,
          companyId: v.company.id,
          description: v.description,
          requirements: v.requirements,
          skills: v.skills.map((s) => s.skill.name),
          matchScore: match.score,
          matchBreakdown: match.breakdown,
          reasons: match.reasons,
        };
      })
      .filter((i) => {
        const taxonomyOk = i.matchBreakdown.specializationMatch >= 0.5 || i.matchBreakdown.roleMatch >= 0.5;
        return i.matchScore >= 45 && taxonomyOk;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const top = items.slice(0, 10);
    await Promise.all(
      top.map(async (item) => {
        try {
          const sem = await this.semanticCompute({ candidate_id: candidateId, vacancy_id: item.id });
          (item as any).semanticSimilarity = sem.similarity;
          (item as any).semanticSource = sem.source;
          item.matchScore = Math.round((item.matchScore * 0.85 + sem.similarity * 100 * 0.15) * 10) / 10;
        } catch {
          /* keep rule score */
        }
      }),
    );
    items.sort((a, b) => b.matchScore - a.matchScore);

    return { total: items.length, items };
  }

  async pair(candidateId: string, vacancyId: string, user: AuthUser) {
    if (user.role === UserRole.EMPLOYER || user.role === UserRole.ADMIN) {
      await this.assertEmployerOwnsVacancy(vacancyId, user);
    } else if (user.role === UserRole.CANDIDATE) {
      const profile = await this.prisma.candidateProfile.findUnique({ where: { userId: user.id } });
      if (!profile || profile.id !== candidateId) {
        throw new ForbiddenException('Нет доступа');
      }
    } else {
      throw new ForbiddenException('Недостаточно прав');
    }

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        skills: { include: { skill: true } },
        achievements: true,
        specialization: true,
        assessmentResults: { where: { status: 'PASSED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { skills: { include: { skill: true } }, company: true, specialization: true },
    });
    if (!candidate || !vacancy) throw new NotFoundException('Пара не найдена');

    const match = calculateMatch(
      {
        id: candidate.id,
        roleTitle: candidate.roleTitle,
        grade: candidate.grade,
        recommendedGrade: candidate.recommendedGrade,
        experienceYears: candidate.experienceYears,
        salaryFrom: candidate.salaryFrom,
        salaryTo: candidate.salaryTo,
        workFormat: candidate.workFormat,
        skills: candidate.skills.map((s) => s.skill.name),
        fspAchievementsCount: candidate.achievements.length,
        specializationId: candidate.specializationId,
        specializationSlug: candidate.specialization?.slug,
        assessmentScore: candidate.assessmentResults[0]?.score ?? null,
      },
      {
        roleTitle: vacancy.roleTitle,
        grade: vacancy.grade,
        experienceFrom: vacancy.experienceFrom,
        experienceTo: vacancy.experienceTo,
        salaryFrom: vacancy.salaryFrom,
        salaryTo: vacancy.salaryTo,
        workFormat: vacancy.workFormat,
        skills: vacancy.skills.map((s) => s.skill.name),
        specializationId: vacancy.specializationId,
        specializationSlug: vacancy.specialization?.slug,
      },
    );

    const semantic = await this.semanticCompute({ candidate_id: candidateId, vacancy_id: vacancyId });

    return {
      vacancy: {
        id: vacancy.id,
        title: vacancy.title,
        roleTitle: vacancy.roleTitle,
        grade: vacancy.grade,
        company: { id: vacancy.company.id, name: vacancy.company.name },
      },
      candidate: {
        id: candidate.id,
        name: `${candidate.user.firstName} ${candidate.user.lastName}`,
        roleTitle: candidate.roleTitle,
      },
      matchScore: match.score,
      blendedScore: Math.round((match.score * 0.85 + semantic.similarity * 100 * 0.15) * 10) / 10,
      breakdown: match.breakdown,
      reasons: match.reasons,
      semantic,
    };
  }
}
