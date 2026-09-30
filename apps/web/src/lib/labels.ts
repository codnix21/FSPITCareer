export const GRADE_LABEL: Record<string, string> = {
  JUNIOR: 'Джуниор',
  MIDDLE: 'Мидл',
  SENIOR: 'Сеньор',
  LEAD: 'Лид',
};

export const FORMAT_LABEL: Record<string, string> = {
  REMOTE: 'Удалённо',
  OFFICE: 'Офис',
  HYBRID: 'Гибрид',
};

export const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Ожидает ответа',
  ACCEPTED: 'Принято',
  REJECTED: 'Отклонено',
  WITHDRAWN: 'Отозвано',
};

export const ROLE_LABEL: Record<string, string> = {
  CANDIDATE: 'Соискатель',
  EMPLOYER: 'Работодатель',
  ADMIN: 'Администратор',
};

export const VACANCY_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активна',
  CLOSED: 'Закрыта',
};

export const SEMANTIC_SOURCE_LABEL: Record<string, string> = {
  deterministic_fallback: 'Расчёт соответствия',
  hash_embedding_mock: 'Семантический анализ',
  sentence_transformers: 'Семантическая модель',
};

export function formatSalary(from?: number | null, to?: number | null) {
  if (from == null && to == null) return 'По договорённости';
  const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
  if (from != null && to != null) return `${fmt(from)}–${fmt(to)} ₽`;
  if (from != null) return `от ${fmt(from)} ₽`;
  return `до ${fmt(to!)} ₽`;
}

export function formatSalaryShort(from?: number | null, to?: number | null) {
  if (from == null && to == null) return 'По договорённости';
  const k = (n: number) => `${Math.round(n / 1000)}`;
  if (from != null && to != null) return `${k(from)}–${k(to)} тыс. ₽`;
  if (from != null) return `от ${k(from)} тыс. ₽`;
  return `до ${k(to!)} тыс. ₽`;
}

export function experienceLabel(years: number) {
  const y = Math.floor(years);
  const mod10 = y % 10;
  const mod100 = y % 100;
  let word = 'лет';
  if (mod10 === 1 && mod100 !== 11) word = 'год';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'года';
  if (years % 1 !== 0) return `${years} ${word} опыта`;
  return `${y} ${word} опыта`;
}

export const ROLE_OPTIONS = [
  'Backend Developer',
  'Frontend Developer',
  'Fullstack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'ML Engineer',
  'QA Engineer',
  'Mobile Developer',
  'Embedded Developer',
  'System Administrator',
];

export const TECH_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP',
  'React', 'Vue', 'Angular', 'Node.js', 'NestJS', 'FastAPI', 'Django', 'Spring',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'Linux',
];
