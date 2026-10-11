/** Подписи и утилиты для визуализации соответствия требованиям */

export type MatchBreakdown = {
  roleMatch: number;
  specializationMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  gradeMatch: number;
  salaryMatch: number;
  workFormatMatch: number;
  fspMatch: number;
  assessmentMatch: number;
};

export const MATCH_BREAKDOWN_LABELS: { key: keyof MatchBreakdown; label: string }[] = [
  { key: 'specializationMatch', label: 'Специализация' },
  { key: 'roleMatch', label: 'Роль' },
  { key: 'skillsMatch', label: 'Навыки' },
  { key: 'experienceMatch', label: 'Опыт' },
  { key: 'gradeMatch', label: 'Уровень' },
  { key: 'assessmentMatch', label: 'Тест' },
  { key: 'salaryMatch', label: 'Зарплата' },
  { key: 'workFormatMatch', label: 'Формат' },
  { key: 'fspMatch', label: 'ФСП' },
];

export function pct(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

export function normalizeBreakdown(raw?: Partial<MatchBreakdown> | null): MatchBreakdown | null {
  if (!raw) return null;
  return {
    roleMatch: Number(raw.roleMatch ?? 0),
    specializationMatch: Number(raw.specializationMatch ?? raw.roleMatch ?? 0),
    skillsMatch: Number(raw.skillsMatch ?? 0),
    experienceMatch: Number(raw.experienceMatch ?? 0),
    gradeMatch: Number(raw.gradeMatch ?? 0),
    salaryMatch: Number(raw.salaryMatch ?? 0),
    workFormatMatch: Number(raw.workFormatMatch ?? 0),
    fspMatch: Number(raw.fspMatch ?? 0),
    assessmentMatch: Number(raw.assessmentMatch ?? 0),
  };
}

export function checklistFromBreakdown(b: MatchBreakdown) {
  return [
    { ok: b.specializationMatch >= 0.8, text: b.specializationMatch >= 0.8 ? 'Подходит специализация' : 'Специализация отличается' },
    { ok: b.skillsMatch >= 0.8, text: b.skillsMatch >= 1 ? 'Все ключевые технологии' : b.skillsMatch >= 0.8 ? 'Большинство ключевых технологий' : 'Частичное совпадение технологий' },
    { ok: b.gradeMatch >= 0.8, text: b.gradeMatch >= 0.8 ? 'Подходит уровень' : 'Уровень отличается' },
    { ok: b.assessmentMatch >= 0.65, text: b.assessmentMatch >= 0.65 ? 'Есть результат тестирования' : 'Слабый или нет результата теста' },
    { ok: b.workFormatMatch >= 0.8, text: b.workFormatMatch >= 0.8 ? 'Подходит формат работы' : 'Формат работы отличается' },
    { ok: b.salaryMatch >= 0.7, text: b.salaryMatch >= 0.7 ? 'Зарплатные ожидания подходят' : 'Зарплатные ожидания расходятся' },
    { ok: b.fspMatch > 0, text: b.fspMatch > 0 ? 'Есть достижения ФСП' : 'Нет достижений ФСП' },
  ];
}
