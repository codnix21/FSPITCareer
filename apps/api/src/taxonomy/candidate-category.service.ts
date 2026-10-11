import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Grade } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GRADE_LABEL_RU } from '../../prisma/taxonomy';

@Injectable()
export class CandidateCategoryService {
  constructor(private prisma: PrismaService) {}

  async resolveCategory(specializationId: string, grade: Grade) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id: specializationId },
      include: { industry: true },
    });
    if (!specialization || !specialization.isActive) {
      throw new NotFoundException('Специализация не найдена');
    }

    let category = await this.prisma.candidateCategory.findUnique({
      where: { specializationId_grade: { specializationId, grade } },
    });

    if (!category) {
      const gradeLabel = GRADE_LABEL_RU[grade] || grade;
      category = await this.prisma.candidateCategory.create({
        data: {
          specializationId,
          grade,
          slug: `${specialization.slug}-${grade.toLowerCase()}`,
          name: `${specialization.name} · ${gradeLabel}`,
          isActive: true,
        },
      });
    }

    return { category, specialization };
  }

  async validateCategoryCombination(params: {
    industryId?: string | null;
    specializationId?: string | null;
    candidateCategoryId?: string | null;
    grade?: Grade | null;
  }) {
    const { industryId, specializationId, candidateCategoryId, grade } = params;

    if (specializationId) {
      const spec = await this.prisma.specialization.findUnique({ where: { id: specializationId } });
      if (!spec || !spec.isActive) throw new BadRequestException('Некорректная специализация');
      if (industryId && spec.industryId !== industryId) {
        throw new BadRequestException('Специализация не относится к выбран отрасли');
      }
    }

    if (candidateCategoryId) {
      const cat = await this.prisma.candidateCategory.findUnique({ where: { id: candidateCategoryId } });
      if (!cat || !cat.isActive) throw new BadRequestException('Некорректная категория');
      if (specializationId && cat.specializationId !== specializationId) {
        throw new BadRequestException('Категория не соответствует специализации');
      }
      if (grade && cat.grade !== grade) {
        throw new BadRequestException('Категория не соответствует грейду');
      }
    }
  }

  listIndustries() {
    return this.prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listSpecializations(industryId?: string) {
    return this.prisma.specialization.findMany({
      where: {
        isActive: true,
        ...(industryId ? { industryId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  listCategories(specializationId?: string, grade?: Grade) {
    return this.prisma.candidateCategory.findMany({
      where: {
        isActive: true,
        ...(specializationId ? { specializationId } : {}),
        ...(grade ? { grade } : {}),
      },
      include: { specialization: true },
      orderBy: { name: 'asc' },
    });
  }
}
