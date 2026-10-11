import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, OfferStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditService } from './audit.service';

export type ContactRevealReason = 'ACCEPTED_OFFER' | 'SELF_APPLICATION' | 'ADMIN';

export type CandidateContactDto = {
  email: string;
  phone: string | null;
  offerId: string | null;
  applicationId: string | null;
  reason: ContactRevealReason;
};

const SELF_APPLY_REVEAL_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.REVIEWING,
  ApplicationStatus.ACCEPTED,
];

@Injectable()
export class ContactRevealService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async canRevealCandidateContact(employerUserId: string, candidateProfileId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateProfileId },
      select: { id: true, userId: true },
    });
    if (!profile) throw new NotFoundException('Профиль не найден');

    const offer = await this.prisma.offer.findFirst({
      where: {
        employerId: employerUserId,
        candidateId: profile.userId,
        status: OfferStatus.ACCEPTED,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (offer) {
      return {
        allowed: true as const,
        reason: 'ACCEPTED_OFFER' as ContactRevealReason,
        offer,
        application: null,
        profile,
      };
    }

    const application = await this.prisma.application.findFirst({
      where: {
        candidateId: profile.id,
        status: { in: SELF_APPLY_REVEAL_STATUSES },
        vacancy: { company: { userId: employerUserId } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (application) {
      return {
        allowed: true as const,
        reason: 'SELF_APPLICATION' as ContactRevealReason,
        offer: null,
        application,
        profile,
      };
    }

    return { allowed: false as const, reason: null, offer: null, application: null, profile };
  }

  async revealCandidateContact(
    requester: { id: string; role: UserRole },
    candidateProfileId: string,
  ): Promise<CandidateContactDto> {
    if (requester.role === UserRole.ADMIN) {
      const profile = await this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
        include: { user: { select: { email: true, phone: true } } },
      });
      if (!profile) throw new NotFoundException('Профиль не найден');
      await this.audit.log({
        actorUserId: requester.id,
        action: AuditAction.CONTACT_REVEALED,
        entityType: 'CandidateProfile',
        entityId: candidateProfileId,
        metadata: { candidateId: candidateProfileId, employerId: requester.id, reason: 'ADMIN' },
      });
      return {
        email: profile.user.email,
        phone: profile.user.phone,
        offerId: null,
        applicationId: null,
        reason: 'ADMIN',
      };
    }

    if (requester.role !== UserRole.EMPLOYER) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const check = await this.canRevealCandidateContact(requester.id, candidateProfileId);
    if (!check.allowed) {
      throw new ForbiddenException(
        'Контактные данные доступны после принятого предложения или отклика кандидата на вашу вакансию',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: check.profile.userId },
      select: { email: true, phone: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    await this.audit.log({
      actorUserId: requester.id,
      action: AuditAction.CONTACT_REVEALED,
      entityType: check.reason === 'ACCEPTED_OFFER' ? 'Offer' : 'Application',
      entityId: check.offer?.id || check.application?.id,
      metadata: {
        candidateId: candidateProfileId,
        employerId: requester.id,
        reason: check.reason,
        offerId: check.offer?.id,
        applicationId: check.application?.id,
      },
    });

    return {
      email: user.email,
      phone: user.phone,
      offerId: check.offer?.id ?? null,
      applicationId: check.application?.id ?? null,
      reason: check.reason!,
    };
  }
}
