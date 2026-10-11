import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacancyDto, UpdateVacancyDto } from './dto/vacancy.dto';
import { UserRole, VacancyStatus } from '@prisma/client';
import { SkillPersistenceService } from '../reference/skill-persistence.service';

const vacancyInclude = {
  company: true,
  skills: { include: { skill: true } },
  industry: true,
  specialization: true,
};

@Injectable()
export class VacanciesService {
  constructor(
    private prisma: PrismaService,
    private skills: SkillPersistenceService,
  ) {}

  async findAll(query?: { status?: VacancyStatus; companyId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.companyId) where.companyId = query.companyId;

    const items = await this.prisma.vacancy.findMany({
      where,
      include: vacancyInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { total: items.length, items };
  }

  async findOne(id: string) {
    const item = await this.prisma.vacancy.findUnique({
      where: { id },
      include: vacancyInclude,
    });
    if (!item) throw new NotFoundException('Вакансия не найдена');
    return item;
  }

  async create(dto: CreateVacancyDto, userId: string) {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) throw new ForbiddenException('Профиль компании не найден');

    const vacancy = await this.prisma.vacancy.create({
      data: {
        companyId: company.id,
        title: dto.title,
        roleTitle: dto.roleTitle,
        grade: dto.grade,
        experienceFrom: dto.experienceFrom ?? 0,
        experienceTo: dto.experienceTo,
        salaryFrom: dto.salaryFrom,
        salaryTo: dto.salaryTo,
        workFormat: dto.workFormat ?? 'REMOTE',
        description: dto.description,
        requirements: dto.requirements,
        industryId: dto.industryId,
        specializationId: dto.specializationId,
        status: 'ACTIVE',
      },
    });

    await this.syncSkills(vacancy.id, dto.technologies);
    return this.findOne(vacancy.id);
  }

  async update(id: string, dto: UpdateVacancyDto, requester: { id: string; role: UserRole }) {
    const vacancy = await this.findOne(id);
    if (requester.role !== UserRole.ADMIN) {
      const company = await this.prisma.company.findUnique({ where: { userId: requester.id } });
      if (!company || company.id !== vacancy.companyId) {
        throw new ForbiddenException('Нельзя редактировать чужую вакансию');
      }
    }

    const { technologies, ...data } = dto;
    await this.prisma.vacancy.update({ where: { id }, data });
    if (technologies) await this.syncSkills(id, technologies);
    return this.findOne(id);
  }

  async mine(userId: string) {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) return { total: 0, items: [] };
    return this.findAll({ companyId: company.id });
  }

  async close(id: string, requester: { id: string; role: UserRole }) {
    return this.update(id, { status: 'CLOSED' }, requester);
  }

  async remove(id: string, requester: { id: string; role: UserRole }) {
    const vacancy = await this.findOne(id);
    if (requester.role !== UserRole.ADMIN) {
      const company = await this.prisma.company.findUnique({ where: { userId: requester.id } });
      if (!company || company.id !== vacancy.companyId) {
        throw new ForbiddenException('Нельзя удалить чужую вакансию');
      }
    }
    await this.prisma.vacancy.delete({ where: { id } });
    return { message: 'Вакансия удалена', id };
  }

  private async syncSkills(vacancyId: string, technologies: string[]) {
    await this.prisma.vacancySkill.deleteMany({ where: { vacancyId } });
    for (const name of technologies) {
      const skill = await this.skills.ensureSkill({ name });
      await this.prisma.vacancySkill.create({
        data: { vacancyId, skillId: skill.id, isRequired: true },
      });
    }
  }

  async employerStats(userId: string) {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company) {
      return { activeVacancies: 0, foundCandidates: 0, sentOffers: 0, responses: 0 };
    }

    const [activeVacancies, matches, sentOffers, responses] = await Promise.all([
      this.prisma.vacancy.count({ where: { companyId: company.id, status: 'ACTIVE' } }),
      this.prisma.match.count({ where: { vacancy: { companyId: company.id } } }),
      this.prisma.offer.count({ where: { companyId: company.id } }),
      this.prisma.offer.count({
        where: { companyId: company.id, status: { in: ['ACCEPTED', 'REJECTED'] } },
      }),
    ]);

    return { activeVacancies, foundCandidates: matches, sentOffers, responses, companyName: company.name };
  }
}
