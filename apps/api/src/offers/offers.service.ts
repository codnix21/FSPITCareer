import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { OfferStatus, UserRole } from '@prisma/client';
import { toOfferResponse } from '../privacy/candidate-privacy';
import { AuditAction, AuditService } from '../privacy/audit.service';

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
      phone: true,
      candidateProfile: { select: { id: true } },
    },
  },
};

const ALLOWED_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.PENDING]: [OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.WITHDRAWN, OfferStatus.EXPIRED],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.REJECTED]: [],
  [OfferStatus.WITHDRAWN]: [],
  [OfferStatus.EXPIRED]: [],
};

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private ttlDays() {
    return Math.max(1, Number(process.env.OFFER_TTL_DAYS || 14));
  }

  private serialize(offer: any, viewer: { id: string; role: UserRole }) {
    const isEmployerSide = viewer.role === UserRole.EMPLOYER || viewer.role === UserRole.ADMIN;
    const isCandidateSide = viewer.role === UserRole.CANDIDATE || viewer.role === UserRole.ADMIN;
    const accepted = offer.status === OfferStatus.ACCEPTED;

    return toOfferResponse(offer, viewer, {
      includeCandidateContact:
        accepted && isEmployerSide && (viewer.role === UserRole.ADMIN || offer.employerId === viewer.id),
      includeEmployerContact:
        accepted && isCandidateSide && (viewer.role === UserRole.ADMIN || offer.candidateId === viewer.id),
    });
  }

  /** Mark PENDING offers past expiresAt as EXPIRED (backend authority). */
  async expireIfNeeded(offer: { id: string; status: OfferStatus; expiresAt?: Date | null }) {
    if (offer.status !== OfferStatus.PENDING || !offer.expiresAt) return offer;
    if (offer.expiresAt.getTime() > Date.now()) return offer;
    return this.prisma.offer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.EXPIRED },
      include: offerInclude,
    });
  }

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

    const salaryFrom = dto.salaryFrom ?? dto.salary ?? vacancy.salaryFrom ?? null;
    const salaryTo = dto.salaryTo ?? vacancy.salaryTo ?? null;
    const expiresAt =
      dto.expiresAt != null
        ? new Date(dto.expiresAt)
        : new Date(Date.now() + this.ttlDays() * 24 * 3600 * 1000);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Некорректная дата истечения предложения');
    }

    const offer = await this.prisma.offer.create({
      data: {
        vacancyId: dto.vacancyId,
        companyId: company.id,
        employerId,
        candidateId: dto.candidateUserId,
        title: dto.title ?? vacancy.title,
        description: dto.description ?? vacancy.description ?? null,
        salary: salaryFrom,
        salaryFrom,
        salaryTo,
        currency: dto.currency ?? 'RUB',
        workFormat: dto.workFormat ?? vacancy.workFormat,
        message: dto.message,
        expiresAt,
        status: OfferStatus.PENDING,
      },
      include: offerInclude,
    });

    await this.audit.log({
      actorUserId: employerId,
      action: AuditAction.OFFER_CREATED,
      entityType: 'Offer',
      entityId: offer.id,
      metadata: { vacancyId: dto.vacancyId, candidateId: dto.candidateUserId },
    });

    return this.serialize(offer, { id: employerId, role: UserRole.EMPLOYER });
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

    const normalized = await Promise.all(
      items.map(async (o) => {
        const fresh = await this.expireIfNeeded(o);
        return this.serialize(fresh, user);
      }),
    );

    return { total: normalized.length, items: normalized };
  }

  async findOne(id: string, user: { id: string; role: UserRole }) {
    let offer = await this.prisma.offer.findUnique({ where: { id }, include: offerInclude });
    if (!offer) throw new NotFoundException('Предложение не найдено');
    offer = (await this.expireIfNeeded(offer)) as typeof offer;

    if (user.role === UserRole.ADMIN) return this.serialize(offer, user);
    if (user.role === UserRole.EMPLOYER && offer.employerId === user.id) return this.serialize(offer, user);
    if (user.role === UserRole.CANDIDATE && offer.candidateId === user.id) return this.serialize(offer, user);

    throw new ForbiddenException('Нет доступа к предложению');
  }

  async updateStatus(id: string, dto: UpdateOfferDto, user: { id: string; role: UserRole }) {
    let offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException('Предложение не найдено');

    offer = (await this.expireIfNeeded(offer)) as typeof offer;

    const next = dto.status;
    if (next === OfferStatus.EXPIRED && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Истечение предложения выполняется системой');
    }

    if (offer.status === OfferStatus.EXPIRED && next === OfferStatus.ACCEPTED) {
      throw new BadRequestException('Нельзя принять истёкшее предложение');
    }

    const allowed = ALLOWED_TRANSITIONS[offer.status] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Переход ${offer.status} → ${next} запрещён`);
    }

    if (next === OfferStatus.ACCEPTED || next === OfferStatus.REJECTED) {
      if (user.role !== UserRole.ADMIN && offer.candidateId !== user.id) {
        throw new ForbiddenException('Только кандидат может принять или отклонить предложение');
      }
      if (next === OfferStatus.ACCEPTED && offer.expiresAt && offer.expiresAt.getTime() <= Date.now()) {
        await this.prisma.offer.update({ where: { id }, data: { status: OfferStatus.EXPIRED } });
        throw new BadRequestException('Нельзя принять истёкшее предложение');
      }
    }
    if (next === OfferStatus.WITHDRAWN) {
      if (user.role !== UserRole.ADMIN && offer.employerId !== user.id) {
        throw new ForbiddenException('Только работодатель может отозвать предложение');
      }
    }

    const updated = await this.prisma.offer.update({
      where: { id },
      data: { status: next },
      include: offerInclude,
    });

    const action =
      next === OfferStatus.ACCEPTED
        ? AuditAction.OFFER_ACCEPTED
        : next === OfferStatus.REJECTED
          ? AuditAction.OFFER_REJECTED
          : next === OfferStatus.WITHDRAWN
            ? AuditAction.OFFER_WITHDRAWN
            : AuditAction.OFFER_WITHDRAWN;

    await this.audit.log({
      actorUserId: user.id,
      action,
      entityType: 'Offer',
      entityId: id,
      metadata: { from: offer.status, to: next },
    });

    return this.serialize(updated, user);
  }
}
