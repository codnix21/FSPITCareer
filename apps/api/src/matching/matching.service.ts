import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateMatch, MatchVacancyInput } from './matching.engine';
import { SearchCandidatesDto, SemanticMatchDto } from './dto/search.dto';
import { Grade, WorkFormat } from '@prisma/client';

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async search(dto: SearchCandidatesDto) {
    const candidates = await this.prisma.candidateProfile.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        skills: { include: { skill: true } },
        achievements: true,
      },
    });

    const vacancyInput: MatchVacancyInput = {
      roleTitle: dto.roleTitle,
      grade: dto.grade,
      experienceFrom: dto.experienceFrom ?? 0,
      experienceTo: dto.experienceTo,
      salaryFrom: dto.salaryFrom,
      salaryTo: dto.salaryTo,
      workFormat: dto.workFormat ?? WorkFormat.REMOTE,
      skills: dto.technologies,
    };

    let results = candidates.map((c) => {
      const match = calculateMatch(
        {
          id: c.id,
          roleTitle: c.roleTitle,
          grade: c.grade,
          experienceYears: c.experienceYears,
          salaryFrom: c.salaryFrom,
          salaryTo: c.salaryTo,
          workFormat: c.workFormat,
          skills: c.skills.map((s) => s.skill.name),
          fspAchievementsCount: c.achievements.length,
        },
        vacancyInput,
      );

      return {
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
      };
    });

    if (dto.hasFspAchievements) {
      results = results.filter((r) => r.achievementsCount > 0);
    }

    // Soft filter: prefer relevant, but keep list useful for demo (min score 35)
    results = results.filter((r) => r.matchScore >= 35);

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

  async matchForVacancy(vacancyId: string) {
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { skills: { include: { skill: true } } },
    });
    if (!vacancy) return { total: 0, items: [] };

    return this.search({
      roleTitle: vacancy.roleTitle,
      grade: vacancy.grade,
      technologies: vacancy.skills.map((s) => s.skill.name),
      experienceFrom: vacancy.experienceFrom,
      experienceTo: vacancy.experienceTo ?? undefined,
      salaryFrom: vacancy.salaryFrom ?? undefined,
      salaryTo: vacancy.salaryTo ?? undefined,
      workFormat: vacancy.workFormat,
      vacancyId,
      sortBy: 'match',
    });
  }

  async semantic(dto: SemanticMatchDto) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: dto.candidate_id },
      include: { skills: { include: { skill: true } }, achievements: true },
    });
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: dto.vacancy_id },
      include: { skills: { include: { skill: true } } },
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
        experienceYears: candidate.experienceYears,
        salaryFrom: candidate.salaryFrom,
        salaryTo: candidate.salaryTo,
        workFormat: candidate.workFormat as WorkFormat,
        skills: candidate.skills.map((s) => s.skill.name),
        fspAchievementsCount: candidate.achievements.length,
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
      },
    );

    return {
      similarity: Math.round((match.score / 100) * 100) / 100,
      source: 'deterministic_fallback',
    };
  }

  async matchCandidateToVacancies(candidateId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: { skills: { include: { skill: true } }, achievements: true },
    });
    if (!candidate) return { total: 0, items: [] };

    const vacancies = await this.prisma.vacancy.findMany({
      where: { status: 'ACTIVE' },
      include: {
        skills: { include: { skill: true } },
        company: true,
      },
    });

    const items = vacancies
      .map((v) => {
        const match = calculateMatch(
          {
            id: candidate.id,
            roleTitle: candidate.roleTitle,
            grade: candidate.grade,
            experienceYears: candidate.experienceYears,
            salaryFrom: candidate.salaryFrom,
            salaryTo: candidate.salaryTo,
            workFormat: candidate.workFormat,
            skills: candidate.skills.map((s) => s.skill.name),
            fspAchievementsCount: candidate.achievements.length,
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
      .filter((i) => i.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Enrich top results with semantic similarity from ML service
    const top = items.slice(0, 10);
    await Promise.all(
      top.map(async (item) => {
        try {
          const sem = await this.semantic({ candidate_id: candidateId, vacancy_id: item.id });
          (item as any).semanticSimilarity = sem.similarity;
          (item as any).semanticSource = sem.source;
          // Soft blend: 85% rule-based + 15% semantic
          item.matchScore = Math.round((item.matchScore * 0.85 + sem.similarity * 100 * 0.15) * 10) / 10;
        } catch {
          /* keep rule score */
        }
      }),
    );
    items.sort((a, b) => b.matchScore - a.matchScore);

    return { total: items.length, items };
  }

  async pair(candidateId: string, vacancyId: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        skills: { include: { skill: true } },
        achievements: true,
      },
    });
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { skills: { include: { skill: true } }, company: true },
    });
    if (!candidate || !vacancy) return null;

    const match = calculateMatch(
      {
        id: candidate.id,
        roleTitle: candidate.roleTitle,
        grade: candidate.grade,
        experienceYears: candidate.experienceYears,
        salaryFrom: candidate.salaryFrom,
        salaryTo: candidate.salaryTo,
        workFormat: candidate.workFormat,
        skills: candidate.skills.map((s) => s.skill.name),
        fspAchievementsCount: candidate.achievements.length,
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
      },
    );

    const semantic = await this.semantic({ candidate_id: candidateId, vacancy_id: vacancyId });

    return {
      vacancy,
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
