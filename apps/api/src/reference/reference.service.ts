import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RefItem = {
  id: string;
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

export type RefList = {
  items: RefItem[];
  total: number;
  truncated: boolean;
};

const POSITIONS: { value: string; label: string; aliases: string[] }[] = [
  { value: 'Backend Developer', label: 'Backend-разработчик', aliases: ['backend', 'бэкенд', 'бекенд'] },
  { value: 'Frontend Developer', label: 'Frontend-разработчик', aliases: ['frontend', 'фронтенд', 'фронт'] },
  { value: 'Fullstack Developer', label: 'Fullstack-разработчик', aliases: ['fullstack', 'фулстек'] },
  { value: 'DevOps Engineer', label: 'DevOps-инженер', aliases: ['devops', 'девопс', 'sre'] },
  { value: 'Data Scientist', label: 'Data Scientist', aliases: ['data science', 'дата саентист', 'аналитик данных'] },
  { value: 'ML Engineer', label: 'ML Engineer', aliases: ['ml', 'machine learning', 'машинное обучение'] },
  { value: 'QA Engineer', label: 'QA-инженер', aliases: ['qa', 'тестировщик', 'quality'] },
  { value: 'Mobile Developer', label: 'Мобильный разработчик', aliases: ['mobile', 'android', 'ios'] },
  { value: 'Embedded Developer', label: 'Embedded-разработчик', aliases: ['embedded', 'встраиваемые'] },
  { value: 'System Administrator', label: 'Системный администратор', aliases: ['sysadmin', 'админ', 'системный'] },
  { value: 'Security Engineer', label: 'Инженер по ИБ', aliases: ['security', 'безопасность', 'ib'] },
  { value: 'Software Engineer', label: 'Software Engineer', aliases: ['software', 'разработчик'] },
  { value: 'Product Manager', label: 'Product Manager', aliases: ['pm', 'продакт'] },
  { value: 'Project Manager', label: 'Project Manager', aliases: ['проектный менеджер'] },
  { value: 'UI/UX Designer', label: 'UI/UX Designer', aliases: ['designer', 'дизайн', 'ux', 'ui'] },
  { value: 'Data Analyst', label: 'Аналитик данных', aliases: ['analyst', 'аналитик'] },
  { value: 'Android Developer', label: 'Android-разработчик', aliases: ['android', 'kotlin'] },
  { value: 'iOS Developer', label: 'iOS-разработчик', aliases: ['ios', 'swift'] },
];

const EDUCATION = [
  { value: 'Среднее', label: 'Среднее', aliases: ['школа'] },
  { value: 'Среднее профессиональное', label: 'Среднее профессиональное', aliases: ['колледж', 'ссуз'] },
  { value: 'Высшее', label: 'Высшее', aliases: ['бакалавр', 'специалитет'] },
  { value: 'Магистратура', label: 'Магистратура', aliases: ['магистр'] },
  { value: 'Аспирантура', label: 'Аспирантура', aliases: ['phd', 'кандидат наук'] },
];

const GRADES = [
  { id: 'JUNIOR', label: 'Junior', value: 'JUNIOR' },
  { id: 'MIDDLE', label: 'Middle', value: 'MIDDLE' },
  { id: 'SENIOR', label: 'Senior', value: 'SENIOR' },
  { id: 'LEAD', label: 'Lead', value: 'LEAD' },
];

const WORK_FORMATS = [
  { id: 'REMOTE', label: 'Удалённо', value: 'REMOTE' },
  { id: 'OFFICE', label: 'Офис', value: 'OFFICE' },
  { id: 'HYBRID', label: 'Гибрид', value: 'HYBRID' },
];

function norm(s: string) {
  return s.trim().toLowerCase().replace(/ё/g, 'е');
}

function matchesQuery(q: string, ...parts: (string | null | undefined | string[])[]) {
  if (!q) return true;
  const nq = norm(q);
  return parts.some((p) => {
    if (!p) return false;
    if (Array.isArray(p)) return p.some((x) => norm(x).includes(nq));
    return norm(p).includes(nq);
  });
}

@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}

  private wrap(items: RefItem[], limit: number): RefList {
    const capped = Math.min(Math.max(limit || 20, 1), 50);
    const sliced = items.slice(0, capped);
    return {
      items: sliced,
      total: items.length,
      truncated: items.length > capped,
    };
  }

  async searchSkills(q?: string, limit = 20, category?: string): Promise<RefList> {
    const rows = await this.prisma.skill.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
      take: 400,
    });

    const filtered = rows.filter((s) => matchesQuery(q || '', s.name, s.slug, s.aliases, s.category));
    const items: RefItem[] = filtered.map((s) => ({
      id: s.id,
      label: s.name,
      value: s.name,
      meta: { category: s.category, aliases: s.aliases },
    }));
    return this.wrap(items, limit);
  }

  async searchCities(q?: string, limit = 20): Promise<RefList> {
    const rows = await this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    const filtered = rows.filter((c) => matchesQuery(q || '', c.name, c.region, c.country, c.aliases));
    const items: RefItem[] = filtered.map((c) => ({
      id: c.id,
      label: c.region ? `${c.name} · ${c.region}` : c.name,
      value: c.name,
      meta: { region: c.region, country: c.country },
    }));
    return this.wrap(items, limit);
  }

  searchPositions(q?: string, limit = 20): RefList {
    const filtered = POSITIONS.filter((p) => matchesQuery(q || '', p.value, p.label, p.aliases));
    const items: RefItem[] = filtered.map((p) => ({
      id: p.value,
      label: p.label,
      value: p.value,
    }));
    return this.wrap(items, limit);
  }

  async searchCompanies(q?: string, limit = 20): Promise<RefList> {
    const rows = await this.prisma.company.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { city: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit || 20, 1), 50),
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        label: c.city ? `${c.name} · ${c.city}` : c.name,
        value: c.name,
        meta: { city: c.city },
      })),
      total: rows.length,
      truncated: false,
    };
  }

  searchEducation(q?: string, limit = 20): RefList {
    const filtered = EDUCATION.filter((e) => matchesQuery(q || '', e.value, e.label, e.aliases));
    const items: RefItem[] = filtered.map((e) => ({
      id: e.value,
      label: e.label,
      value: e.value,
    }));
    return this.wrap(items, limit);
  }

  listGrades(): RefList {
    return { items: GRADES, total: GRADES.length, truncated: false };
  }

  listWorkFormats(): RefList {
    return { items: WORK_FORMATS, total: WORK_FORMATS.length, truncated: false };
  }
}
