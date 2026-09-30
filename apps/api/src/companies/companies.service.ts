import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { vacancies: true, offers: true } },
      },
    });
    if (!company) throw new NotFoundException('Профиль компании не найден');
    return company;
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        vacancies: { where: { status: 'ACTIVE' }, take: 20 },
        _count: { select: { vacancies: true, offers: true } },
      },
    });
    if (!company) throw new NotFoundException('Компания не найдена');
    return company;
  }

  async update(userId: string, dto: UpdateCompanyDto, role: UserRole) {
    const company = await this.prisma.company.findUnique({ where: { userId } });
    if (!company && role !== UserRole.ADMIN) {
      throw new NotFoundException('Профиль компании не найден');
    }
    if (!company) throw new NotFoundException('Профиль компании не найден');
    return this.prisma.company.update({
      where: { id: company.id },
      data: dto,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { vacancies: true, offers: true } },
      },
    });
  }

  async list() {
    return this.prisma.company.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { vacancies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
