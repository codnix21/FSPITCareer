import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const AuditAction = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PROFILE_VIEWED: 'PROFILE_VIEWED',
  ASSESSMENT_STARTED: 'ASSESSMENT_STARTED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
  ASSESSMENT_SUBMITTED: 'ASSESSMENT_SUBMITTED',
  ASSESSMENT_PASSED: 'ASSESSMENT_PASSED',
  ASSESSMENT_FAILED: 'ASSESSMENT_FAILED',
  OFFER_CREATED: 'OFFER_CREATED',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  OFFER_REJECTED: 'OFFER_REJECTED',
  OFFER_WITHDRAWN: 'OFFER_WITHDRAWN',
  CONTACT_REVEALED: 'CONTACT_REVEALED',
  RESUME_UPLOADED: 'RESUME_UPLOADED',
  FSP_SYNC: 'FSP_SYNC',
  APPLICATION_CREATED: 'APPLICATION_CREATED',
  APPLICATION_REVIEWED: 'APPLICATION_REVIEWED',
  APPLICATION_ACCEPTED: 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  APPLICATION_WITHDRAWN: 'APPLICATION_WITHDRAWN',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
  CHALLENGE_STARTED: 'CHALLENGE_STARTED',
  CHALLENGE_SUBMITTED: 'CHALLENGE_SUBMITTED',
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  CHALLENGE_PASSED: 'CHALLENGE_PASSED',
  CHALLENGE_FAILED: 'CHALLENGE_FAILED',
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    actorUserId?: string | null;
    action: AuditActionName | string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const metadata = params.metadata ? this.sanitizeMetadata(params.metadata) : undefined;
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      /* audit must not break business flow */
    }
  }

  private sanitizeMetadata(meta: Record<string, unknown>) {
    const blocked = new Set([
      'password',
      'passwordHash',
      'currentPassword',
      'newPassword',
      'token',
      'accessToken',
      'refreshToken',
      'jwt',
      'email',
      'phone',
      'authorization',
    ]);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (blocked.has(k.toLowerCase())) continue;
      out[k] = v;
    }
    return out;
  }
}
