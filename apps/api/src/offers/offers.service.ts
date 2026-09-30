import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { OfferStatus, UserRole } from '@prisma/client';

const offerInclude = {
  vacancy: { include: { skills: { include: { skill: true } } } },
  company: true,
  employer: { select: { id: true, firstName: true, lastName: true, email: true } },
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      candidateProfile: { select: { id: true } },
    },
  },
};

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOfferDto, employerId: string) {
    const company = await this.prisma.company.findUnique({ where: { userId: employerId } });
    if (!company) throw new ForbiddenException('Профиль компании не найден');

    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: dto.vacancyId } });
    if (!vacancy || vacancy.companyId !== company.id) {
      throw new BadRequestException('Вакансия не найдена или не принадлежит вашей компании');
    }

    const candidate = await this.prisma.user.findUnique({ where: { id: dto.candidateUserId } });
    if (!candidate || candidate.role !== UserRole.CANDIDATE) {
      throw new BadRequestException('Кандидат не найден');
    }

    const existing = await this.prisma.offer.findFirst({
      where: {
        vacancyId: dto.vacancyId,
        candidateId: dto.candidateUserId,
        status: OfferStatus.PENDING,
      },
    });
    if (existing) throw new BadRequestException('Предложение по этой вакансии уже отправлено');

    return this.prisma.offer.create({
      data: {
        vacancyId: dto.vacancyId,
        companyId: company.id,
        employerId,
        candidateId: dto.candidateUserId,
        salary: dto.salary,
        workFormat: dto.workFormat ?? vacancy.workFormat,
        message: dto.message,
        status: OfferStatus.PENDING,
      },
      include: offerInclude,
    });
  }

  async findAll(user: { id: string; role: UserRole }) {
    const where: any = {};
    if (user.role === UserRole.CANDIDATE) where.candidateId = user.id;
    else if (user.role === UserRole.EMPLOYER) where.employerId = user.id;

    const items = await this.prisma.offer.findMany({
      where,
      include: offerInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { total: items.length, items };
  }

  async updateStatus(id: string, dto: UpdateOfferDto, user: { id: string; role: UserRole }) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Предложение не найдено');

    if (dto.status === OfferStatus.ACCEPTED || dto.status === OfferStatus.REJECTED) {
      if (user.role !== UserRole.ADMIN && offer.candidateId !== user.id) {
        throw new ForbiddenException('Только кандидат может принять или отклонить предложение');
      }
    }
    if (dto.status === OfferStatus.WITHDRAWN) {
      if (user.role !== UserRole.ADMIN && offer.employerId !== user.id) {
        throw new ForbiddenException('Только работодатель может отозвать предложение');
      }
    }

    if (offer.status !== OfferStatus.PENDING && dto.status !== OfferStatus.WITHDRAWN) {
      throw new BadRequestException('Предложение уже обработано');
    }

    return this.prisma.offer.update({
      where: { id },
      data: { status: dto.status },
      include: offerInclude,
    });
  }
}
