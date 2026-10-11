import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { FspAchievementSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditService } from '../privacy/audit.service';
import {
  FSP_PROVIDER,
  FspProvider,
  FspProviderStatus,
} from './providers/fsp-provider';

@Injectable()
export class FspService {
  constructor(
    private prisma: PrismaService,
    @Inject(FSP_PROVIDER) private provider: FspProvider,
    private audit: AuditService,
  ) {}

  async getStatus(participantId: string): Promise<{ status: FspProviderStatus }> {
    const status = await this.provider.getStatus(participantId);
    return { status };
  }

  async getParticipant(idOrExternal: string) {
    const status = await this.provider.getStatus(idOrExternal);
    if (status === 'UNAVAILABLE') {
      throw new ServiceUnavailableException({
        code: 'FSP_UNAVAILABLE',
        message: 'Сервис ФСП временно недоступен',
        status,
      });
    }
    const participant = await this.provider.getParticipant(idOrExternal);
    if (!participant || status === 'NOT_FOUND') {
      throw new NotFoundException({
        code: 'FSP_NOT_FOUND',
        message: 'Участник ФСП не найден',
        status: 'NOT_FOUND',
      });
    }
    return participant;
  }

  /**
   * Safe for matching/profile: never throws; UNAVAILABLE → empty + status.
   */
  async safeAchievements(participantId: string | null | undefined) {
    if (!participantId) {
      return { status: 'NOT_FOUND' as FspProviderStatus, items: [] as Awaited<ReturnType<FspProvider['getAchievements']>> };
    }
    const status = await this.provider.getStatus(participantId);
    if (status === 'UNAVAILABLE') {
      return { status, items: [] };
    }
    if (status === 'NOT_FOUND') {
      return { status, items: [] };
    }
    const items = await this.provider.getAchievements(participantId);
    return { status, items };
  }

  /**
   * Matching contribution: count of achievements, or 0 if UNAVAILABLE/NOT_FOUND.
   */
  async matchingFspCount(participantId: string | null | undefined): Promise<number> {
    const { status, items } = await this.safeAchievements(participantId);
    if (status === 'UNAVAILABLE' || status === 'NOT_FOUND') return 0;
    return items.length;
  }

  async listParticipants() {
    const items = await this.prisma.fspParticipant.findMany({
      include: {
        disciplines: { include: { discipline: true } },
        results: { include: { competition: true } },
      },
      orderBy: { name: 'asc' },
    });
    return {
      total: items.length,
      notice: 'Данные ФСП (локальный каталог)',
      items: items.map((p) => ({
        participantId: p.externalId,
        name: p.name,
        isDemo: p.isDemo,
        sourceType: p.isDemo ? 'DEMO' : 'FSP',
        competitionsCount: p.results.length,
        disciplines: p.disciplines.map((d) => d.discipline.name),
      })),
    };
  }

  async listAchievements() {
    return this.prisma.fspAchievement.findMany({
      include: {
        candidate: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { year: 'desc' },
    });
  }

  async syncToCandidateProfile(params: {
    candidateProfileId: string;
    fspParticipantId: string;
    actorUserId: string;
  }) {
    const status = await this.provider.getStatus(params.fspParticipantId);
    if (status === 'UNAVAILABLE') {
      throw new ServiceUnavailableException({
        code: 'FSP_UNAVAILABLE',
        message: 'Сервис ФСП временно недоступен. Профиль не изменён.',
        status,
      });
    }
    if (status === 'NOT_FOUND') {
      throw new NotFoundException({
        code: 'FSP_NOT_FOUND',
        message: 'Участник ФСП не найден',
        status,
      });
    }

    const achievements = await this.provider.getAchievements(params.fspParticipantId);
    await this.prisma.fspAchievement.deleteMany({ where: { candidateId: params.candidateProfileId } });
    for (const a of achievements) {
      await this.prisma.fspAchievement.create({
        data: {
          candidateId: params.candidateProfileId,
          title: a.title,
          discipline: a.discipline,
          place: a.place,
          year: a.year,
          status: a.status,
          isDemo: a.isDemo,
          source: a.source === 'FSP' ? FspAchievementSource.FSP : FspAchievementSource.DEMO,
        },
      });
    }

    await this.audit.log({
      actorUserId: params.actorUserId,
      action: AuditAction.FSP_SYNC,
      entityType: 'CandidateProfile',
      entityId: params.candidateProfileId,
      metadata: {
        participantExternalId: params.fspParticipantId,
        status,
        count: achievements.length,
        isDemo: achievements.some((x) => x.isDemo),
      },
    });

    return { status, synced: achievements.length };
  }
}
