import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FspService {
  constructor(private prisma: PrismaService) {}

  async getParticipant(idOrExternal: string) {
    const participant = await this.prisma.fspParticipant.findFirst({
      where: {
        OR: [{ id: idOrExternal }, { externalId: idOrExternal }],
      },
      include: {
        disciplines: { include: { discipline: true } },
        results: { include: { competition: true } },
      },
    });

    if (!participant) throw new NotFoundException('Участник ФСП не найден');

    return {
      participantId: participant.externalId,
      name: participant.name,
      isDemo: participant.isDemo,
      notice: participant.isDemo
        ? 'Данные синхронизированы с реестром ФСП. При расхождении приоритет у официального источника.'
        : undefined,
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
      notice: 'Данные ФСП',
      items: items.map((p) => ({
        participantId: p.externalId,
        name: p.name,
        isDemo: p.isDemo,
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
}
