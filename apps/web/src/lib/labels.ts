export const GRADE_LABEL: Record<string, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MIDDLE: 'Middle',
  SENIOR: 'Senior',
  LEAD: 'Lead',
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
  EXPIRED: 'Истекло',
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Отправлен',
  REVIEWING: 'На рассмотрении',
  ACCEPTED: 'Принят',
  REJECTED: 'Отклонён',
  WITHDRAWN: 'Отозван',
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
  hash_embedding_mock: 'Демонстрационный семантический анализ',
  sentence_transformers: 'Семантическая модель',
};

export const FSP_STATUS_LABEL: Record<string, string> = {
  FINALIST: 'Финалист',
  WINNER: 'Победитель',
  PARTICIPANT: 'Участник',
  PRIZE: 'Призёр',
};

/** Короткое название роли для UI → значение в API/БД */
export const ROLE_CARDS: { id: string; label: string; value: string }[] = [
  { id: 'backend', label: 'Backend', value: 'Backend Developer' },
  { id: 'frontend', label: 'Frontend', value: 'Frontend Developer' },
  { id: 'fullstack', label: 'Fullstack', value: 'Fullstack Developer' },
  { id: 'devops', label: 'DevOps', value: 'DevOps Engineer' },
  { id: 'data', label: 'Data Science', value: 'Data Scientist' },
  { id: 'ml', label: 'ML', value: 'ML Engineer' },
  { id: 'qa', label: 'QA', value: 'QA Engineer' },
  { id: 'mobile', label: 'Mobile', value: 'Mobile Developer' },
  { id: 'embedded', label: 'Embedded', value: 'Embedded Developer' },
  { id: 'other', label: 'Другое', value: 'System Administrator' },
];

export const ROLE_OPTIONS = ROLE_CARDS.map((r) => r.value);

export const ROLE_DISPLAY: Record<string, string> = Object.fromEntries(
  ROLE_CARDS.map((r) => [r.value, r.label === 'Другое' ? 'Другая роль' : r.label]),
);

export function roleDisplay(roleTitle?: string | null) {
  if (!roleTitle) return 'Специалист';
  return ROLE_DISPLAY[roleTitle] || roleTitle.replace(/ Developer| Engineer/g, '').trim() || roleTitle;
}

export const TECH_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP',
  'React', 'Vue', 'Angular', 'Node.js', 'NestJS', 'FastAPI', 'Django', 'Spring',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'Linux',
  'Git', 'REST API', 'GraphQL', 'AWS', 'CI/CD', 'Pytest', 'Jest', 'Kafka',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Swift', 'Kotlin', 'Flutter',
];

export const POPULAR_TECH = ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'TypeScript', 'React', 'Node.js', 'Kubernetes', 'Linux'];

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
  const rounded = Math.round(years * 10) / 10;
  const y = Math.floor(years);
  const mod10 = y % 10;
  const mod100 = y % 100;
  let word = 'лет';
  if (mod10 === 1 && mod100 !== 11) word = 'год';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'года';
  if (years % 1 !== 0) {
    // дробный опыт: «1.5 года»
    return `${rounded} года опыта`;
  }
  return `${y} ${word} опыта`;
}

export function fspStatusLabel(status?: string | null) {
  if (!status) return 'Участник';
  return FSP_STATUS_LABEL[status] || status;
}
