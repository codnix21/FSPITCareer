import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const [
      users,
      candidates,
      employers,
      vacancies,
      offers,
      companies,
      achievements,
      skills,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.candidateProfile.count(),
      this.prisma.user.count({ where: { role: 'EMPLOYER' } }),
      this.prisma.vacancy.count(),
      this.prisma.offer.count(),
      this.prisma.company.count(),
      this.prisma.fspAchievement.count(),
      this.prisma.skill.count(),
    ]);

    const offersByStatus = await this.prisma.offer.groupBy({
      by: ['status'],
      _count: true,
    });

    const vacanciesByRole = await this.prisma.vacancy.groupBy({
      by: ['roleTitle'],
      _count: true,
    });

    const candidatesByGrade = await this.prisma.candidateProfile.groupBy({
      by: ['grade'],
      _count: true,
    });

    // Activity: last 7 days mock series from createdAt buckets
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const recentOffers = await this.prisma.offer.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const activityMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      activityMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const o of recentOffers) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (activityMap[key] != null) activityMap[key]++;
    }

    return {
      users,
      candidates,
      employers,
      vacancies,
      offers,
      companies,
      achievements,
      skills,
      charts: {
        candidatesByGrade: candidatesByGrade.map((g) => ({ label: g.grade, value: g._count })),
        vacanciesByRole: vacanciesByRole.map((v) => ({ label: v.roleTitle, value: v._count })),
        offersByStatus: offersByStatus.map((o) => ({ label: o.status, value: o._count })),
        activity: Object.entries(activityMap).map(([date, value]) => ({ date, value })),
      },
    };
  }

  async users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async companies() {
    return this.prisma.company.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } }, _count: { select: { vacancies: true } } },
    });
  }

  async setUserActive(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async exportCsv(entity: 'users' | 'candidates' | 'vacancies' | 'offers') {
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[;",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const join = (rows: string[][]) => rows.map((r) => r.map(esc).join(';')).join('\n');

    if (entity === 'users') {
      const rows = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
      return join([
        ['id', 'email', 'имя', 'фамилия', 'роль', 'активен', 'создан'],
        ...rows.map((u) => [
          u.id,
          u.email,
          u.firstName,
          u.lastName,
          u.role,
          u.isActive ? 'да' : 'нет',
          u.createdAt.toISOString(),
        ]),
      ]);
    }

    if (entity === 'candidates') {
      const rows = await this.prisma.candidateProfile.findMany({
        include: { user: true, skills: { include: { skill: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return join([
        ['id', 'email', 'имя', 'фамилия', 'роль', 'грейд', 'опыт', 'навыки'],
        ...rows.map((c) => [
          c.id,
          c.user.email,
          c.user.firstName,
          c.user.lastName,
          c.roleTitle,
          c.grade,
          String(c.experienceYears),
          c.skills.map((s) => s.skill.name).join(', '),
        ]),
      ]);
    }

    if (entity === 'vacancies') {
      const rows = await this.prisma.vacancy.findMany({
        include: { company: true },
        orderBy: { createdAt: 'desc' },
      });
      return join([
        ['id', 'название', 'компания', 'роль', 'грейд', 'статус', 'зарплата_от', 'зарплата_до'],
        ...rows.map((v) => [
          v.id,
          v.title,
          v.company.name,
          v.roleTitle,
          v.grade,
          v.status,
          v.salaryFrom != null ? String(v.salaryFrom) : '',
          v.salaryTo != null ? String(v.salaryTo) : '',
        ]),
      ]);
    }

    const offers = await this.prisma.offer.findMany({
      include: {
        company: true,
        vacancy: true,
        candidate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return join([
      ['id', 'компания', 'вакансия', 'кандидат', 'статус', 'зарплата', 'создан'],
      ...offers.map((o) => [
        o.id,
        o.company.name,
        o.vacancy.title,
        `${o.candidate.firstName} ${o.candidate.lastName}`,
        o.status,
        o.salary != null ? String(o.salary) : '',
        o.createdAt.toISOString(),
      ]),
    ]);
  }
}
