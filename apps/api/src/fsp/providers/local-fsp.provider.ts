import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FspAchievementView,
  FspParticipantView,
  FspProvider,
  FspProviderStatus,
} from './fsp-provider';

/**
 * Local / seed-backed FSP data. Demo rows live in DB seed (isDemo=true), not in CandidatesService.
 */
@Injectable()
export class LocalFspProvider implements FspProvider {
  constructor(private prisma: PrismaService) {}

  private async findParticipant(participantId: string) {
    return this.prisma.fspParticipant.findFirst({
      where: {
        OR: [{ id: participantId }, { externalId: participantId }],
      },
      include: {
        disciplines: { include: { discipline: true } },
        results: { include: { competition: { include: { discipline: true } } } },
      },
    });
  }

  async getStatus(participantId: string): Promise<FspProviderStatus> {
    try {
      const p = await this.findParticipant(participantId);
      return p ? 'CONNECTED' : 'NOT_FOUND';
    } catch {
      return 'UNAVAILABLE';
    }
  }

  async getParticipant(participantId: string): Promise<FspParticipantView | null> {
    try {
      const participant = await this.findParticipant(participantId);
      if (!participant) return null;
      return {
        participantId: participant.externalId,
        name: participant.name,
        isDemo: participant.isDemo,
        status: 'CONNECTED',
        notice: participant.isDemo
          ? 'Демонстрационные данные ФСП. Это не подтверждённая синхронизация с официальным реестром.'
          : 'Данные участника ФСП.',
        disciplines: participant.disciplines.map((d) => ({
          id: d.discipline.code,
          name: d.discipline.name,
        })),
        competitions: participant.results.map((r) => ({
          name: r.competition.name,
          year: r.competition.year,
          place: r.place,
          status: r.status,
        })),
        roles: participant.roles,
        ranks: participant.ranks,
      };
    } catch {
      return null;
    }
  }

  async getAchievements(participantId: string): Promise<FspAchievementView[]> {
    try {
      const participant = await this.findParticipant(participantId);
      if (!participant) return [];
      const source = participant.isDemo ? ('DEMO' as const) : ('FSP' as const);
      return participant.results.map((r) => ({
        title: r.competition.name,
        discipline: r.competition.discipline?.name || 'Программирование',
        place: r.place,
        year: r.competition.year,
        status: r.status,
        source,
        isDemo: participant.isDemo,
      }));
    } catch {
      return [];
    }
  }
}
