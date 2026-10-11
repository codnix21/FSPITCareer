export type Grade = 'INTERN' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD';
export type WorkFormat = 'REMOTE' | 'OFFICE' | 'HYBRID';

export interface MatchCandidateInput {
  id: string;
  roleTitle: string;
  grade: Grade;
  /** Assessment recommended grade — authoritative for gradeMatch when set */
  recommendedGrade?: Grade | null;
  experienceYears: number;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  workFormat: WorkFormat;
  skills: string[];
  fspAchievementsCount: number;
  specializationId?: string | null;
  specializationSlug?: string | null;
  /** Latest PASSED assessment score 0–100; null if none */
  assessmentScore?: number | null;
}

export interface MatchVacancyInput {
  roleTitle: string;
  grade: Grade;
  experienceFrom: number;
  experienceTo?: number | null;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  workFormat: WorkFormat;
  skills: string[];
  specializationId?: string | null;
  specializationSlug?: string | null;
}

export interface MatchBreakdown {
  roleMatch: number;
  specializationMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  gradeMatch: number;
  salaryMatch: number;
  workFormatMatch: number;
  fspMatch: number;
  assessmentMatch: number;
}

export interface MatchResult {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
}

/** Documented Wave C weight tweak: assessmentMatch 0.05 taken from roleMatch (was 0.15). */
export const MATCH_WEIGHTS = {
  roleMatch: 0.1,
  specializationMatch: 0.15,
  skillsMatch: 0.25,
  experienceMatch: 0.15,
  gradeMatch: 0.1,
  salaryMatch: 0.1,
  workFormatMatch: 0.05,
  fspMatch: 0.05,
  assessmentMatch: 0.05,
};

const WEIGHTS = MATCH_WEIGHTS;

const GRADE_RANK: Record<Grade, number> = {
  INTERN: 0,
  JUNIOR: 1,
  MIDDLE: 2,
  SENIOR: 3,
  LEAD: 4,
};

const GRADE_LABEL: Record<Grade, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MIDDLE: 'Middle',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

const FORMAT_LABEL: Record<WorkFormat, string> = {
  REMOTE: 'Удалённо',
  OFFICE: 'Офис',
  HYBRID: 'Гибрид',
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function roleFamily(value: string): string | null {
  const n = normalize(value);
  const aliases: Record<string, string[]> = {
    backend: ['backend developer', 'бэкенд', 'backend', 'backend development'],
    frontend: ['frontend developer', 'фронтенд', 'frontend', 'frontend development'],
    fullstack: ['fullstack developer', 'full stack', 'фулстек', 'fullstack development'],
    devops: ['devops engineer', 'devops'],
    'data scientist': ['data science', 'data scientist', 'аналитик данных'],
    'data engineering': ['data engineer', 'data engineering'],
    'ml engineer': ['machine learning', 'ml engineer', 'ml', 'инженер мл'],
    qa: ['qa engineer', 'тестировщик', 'quality assurance', 'qa', 'qa / testing'],
    mobile: ['mobile developer', 'android', 'ios', 'mobile', 'mobile development'],
    cybersecurity: ['cybersecurity', 'security', 'информационная безопасность'],
    'ui/ux': ['ui/ux', 'ui', 'ux', 'designer', 'дизайнер'],
    embedded: ['embedded developer', 'embedded'],
    'system administrator': ['sysadmin', 'системный администратор', 'system administrator'],
  };
  for (const [family, group] of Object.entries(aliases)) {
    if (group.some((g) => n.includes(g) || g.includes(n))) return family;
  }
  return null;
}

function roleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const fa = roleFamily(na);
  const fb = roleFamily(nb);
  if (fa && fb) {
    if (fa === fb) return 0.95;
    if (fa === 'fullstack' && (fb === 'backend' || fb === 'frontend')) return 0.55;
    if (fb === 'fullstack' && (fa === 'backend' || fa === 'frontend')) return 0.55;
    return 0.15;
  }

  const stop = new Set(['developer', 'engineer', 'специалист', 'development']);
  const tokens = (s: string) =>
    new Set(
      s
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t && !stop.has(t)),
    );
  const aTokens = tokens(na);
  const bTokens = tokens(nb);
  if (aTokens.size === 0 || bTokens.size === 0) return 0.2;
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap++;
  if (overlap === 0) return 0.2;
  return Math.min(1, 0.4 + (overlap / Math.max(aTokens.size, bTokens.size)) * 0.6);
}

function specializationSimilarity(candidate: MatchCandidateInput, vacancy: MatchVacancyInput): number {
  if (candidate.specializationId && vacancy.specializationId) {
    return candidate.specializationId === vacancy.specializationId ? 1 : 0.1;
  }
  if (candidate.specializationSlug && vacancy.specializationSlug) {
    return candidate.specializationSlug === vacancy.specializationSlug ? 1 : 0.1;
  }
  // Fallback to role family — generic token "developer" alone must not create a strong match
  const fa = roleFamily(candidate.specializationSlug || candidate.roleTitle);
  const fb = roleFamily(vacancy.specializationSlug || vacancy.roleTitle);
  if (fa && fb) {
    if (fa === fb) return 0.95;
    if (fa === 'fullstack' && (fb === 'backend' || fb === 'frontend')) return 0.5;
    if (fb === 'fullstack' && (fa === 'backend' || fa === 'frontend')) return 0.5;
    return 0.1;
  }
  return roleSimilarity(candidate.roleTitle, vacancy.roleTitle);
}

function skillsScore(candidateSkills: string[], vacancySkills: string[]): { score: number; matched: number; total: number } {
  if (!vacancySkills.length) return { score: 1, matched: 0, total: 0 };
  const cand = new Set(candidateSkills.map(normalize));
  let matched = 0;
  for (const s of vacancySkills) {
    if (cand.has(normalize(s))) matched++;
  }
  return { score: matched / vacancySkills.length, matched, total: vacancySkills.length };
}

function experienceScore(years: number, from: number, to?: number | null): number {
  if (years >= from && (to == null || years <= to + 2)) return 1;
  if (years >= from) return 0.85;
  if (years >= from - 1) return 0.7;
  if (years >= from * 0.5) return 0.45;
  return 0.2;
}

function gradeScore(candidate: Grade, required: Grade): number {
  const diff = GRADE_RANK[candidate] - GRADE_RANK[required];
  if (diff === 0) return 1;
  if (diff === 1) return 0.85;
  if (diff === -1) return 0.65;
  if (diff > 1) return 0.7;
  return 0.35;
}

function salaryScore(
  candFrom?: number | null,
  candTo?: number | null,
  vacFrom?: number | null,
  vacTo?: number | null,
): number {
  if (candFrom == null && candTo == null) return 0.7;
  if (vacFrom == null && vacTo == null) return 0.7;

  const cFrom = candFrom ?? candTo ?? 0;
  const cTo = candTo ?? candFrom ?? cFrom;
  const vFrom = vacFrom ?? 0;
  const vTo = vacTo ?? vacFrom ?? Number.MAX_SAFE_INTEGER;

  const overlapStart = Math.max(cFrom, vFrom);
  const overlapEnd = Math.min(cTo, vTo);
  if (overlapStart <= overlapEnd) return 1;

  if (cFrom > vTo) {
    const gap = (cFrom - vTo) / Math.max(vTo, 1);
    if (gap <= 0.1) return 0.8;
    if (gap <= 0.25) return 0.55;
    return 0.25;
  }

  return 0.9;
}

function workFormatScore(candidate: WorkFormat, vacancy: WorkFormat): number {
  if (candidate === vacancy) return 1;
  if (candidate === 'HYBRID' || vacancy === 'HYBRID') return 0.75;
  return 0.35;
}

function fspScore(count: number): number {
  if (count <= 0) return 0.3;
  if (count === 1) return 0.7;
  if (count === 2) return 0.9;
  return 1;
}

function assessmentScoreMatch(score?: number | null): number {
  if (score == null || Number.isNaN(score)) return 0.35;
  if (score >= 85) return 1;
  if (score >= 70) return 0.85;
  if (score >= 50) return 0.65;
  return 0.25;
}

/**
 * Рассчитывает соответствие кандидата требованиям вакансии (0–100).
 */
export function calculateMatch(candidate: MatchCandidateInput, vacancy: MatchVacancyInput): MatchResult {
  const roleMatch = roleSimilarity(candidate.roleTitle, vacancy.roleTitle);
  const specializationMatch = specializationSimilarity(candidate, vacancy);
  const skills = skillsScore(candidate.skills, vacancy.skills);
  const experienceMatch = experienceScore(candidate.experienceYears, vacancy.experienceFrom, vacancy.experienceTo);
  const effectiveGrade = (candidate.recommendedGrade || candidate.grade) as Grade;
  const gradeMatch = gradeScore(effectiveGrade, vacancy.grade);
  const salaryMatch = salaryScore(candidate.salaryFrom, candidate.salaryTo, vacancy.salaryFrom, vacancy.salaryTo);
  const workFormatMatch = workFormatScore(candidate.workFormat, vacancy.workFormat);
  const fspMatch = fspScore(candidate.fspAchievementsCount);
  const assessmentMatch = assessmentScoreMatch(candidate.assessmentScore);

  const breakdown: MatchBreakdown = {
    roleMatch,
    specializationMatch,
    skillsMatch: skills.score,
    experienceMatch,
    gradeMatch,
    salaryMatch,
    workFormatMatch,
    fspMatch,
    assessmentMatch,
  };

  const score =
    (breakdown.roleMatch * WEIGHTS.roleMatch +
      breakdown.specializationMatch * WEIGHTS.specializationMatch +
      breakdown.skillsMatch * WEIGHTS.skillsMatch +
      breakdown.experienceMatch * WEIGHTS.experienceMatch +
      breakdown.gradeMatch * WEIGHTS.gradeMatch +
      breakdown.salaryMatch * WEIGHTS.salaryMatch +
      breakdown.workFormatMatch * WEIGHTS.workFormatMatch +
      breakdown.fspMatch * WEIGHTS.fspMatch +
      breakdown.assessmentMatch * WEIGHTS.assessmentMatch) *
    100;

  const reasons: string[] = [];
  if (specializationMatch >= 0.9) {
    reasons.push(
      `Совпадает специализация: ${candidate.specializationSlug || candidate.roleTitle}`,
    );
  } else if (specializationMatch <= 0.2) {
    reasons.push(
      `Специализация не совпадает: ${candidate.specializationSlug || candidate.roleTitle} ≠ ${vacancy.specializationSlug || vacancy.roleTitle}`,
    );
  }

  if (roleMatch >= 0.8) reasons.push(`Совпадает роль: ${candidate.roleTitle}`);
  else if (roleMatch >= 0.5) reasons.push(`Роль близка: ${candidate.roleTitle} ≈ ${vacancy.roleTitle}`);

  if (skills.total > 0) {
    if (skills.matched === skills.total) reasons.push(`${skills.matched} из ${skills.total} ключевых технологий`);
    else if (skills.matched > 0) reasons.push(`Совпадает ${skills.matched} из ${skills.total} технологий`);
    else reasons.push(`Технологии почти не совпадают (0 из ${skills.total})`);
  }

  reasons.push(
    `Опыт ${candidate.experienceYears} ${candidate.experienceYears === 1 ? 'год' : candidate.experienceYears < 5 ? 'года' : 'лет'} / требуется от ${vacancy.experienceFrom}`,
  );

  if (gradeMatch >= 0.85) reasons.push(`Уровень (по тесту): ${GRADE_LABEL[effectiveGrade] ?? effectiveGrade}`);
  else
    reasons.push(
      `Уровень (по тесту): ${GRADE_LABEL[effectiveGrade] ?? effectiveGrade} (требуется ${GRADE_LABEL[vacancy.grade] ?? vacancy.grade})`,
    );
  if (candidate.assessmentScore != null) {
    reasons.push(`Результат тестирования: ${Math.round(candidate.assessmentScore)}/100`);
  }

  if (salaryMatch >= 0.8) {
    const cSal = candidate.salaryFrom ?? candidate.salaryTo;
    reasons.push(
      cSal != null
        ? `Зарплатные ожидания ${new Intl.NumberFormat('ru-RU').format(cSal)} ₽ входят в диапазон`
        : 'Зарплатные ожидания в диапазоне',
    );
  } else if (candidate.salaryFrom != null || vacancy.salaryTo != null) {
    reasons.push('Зарплатные ожидания частично расходятся с диапазоном');
  }

  if (workFormatMatch >= 0.75) reasons.push(`Формат работы: ${FORMAT_LABEL[candidate.workFormat] ?? candidate.workFormat}`);
  else
    reasons.push(
      `Формат: ${FORMAT_LABEL[candidate.workFormat] ?? candidate.workFormat} (требуется ${FORMAT_LABEL[vacancy.workFormat] ?? vacancy.workFormat})`,
    );

  if (candidate.fspAchievementsCount > 0) {
    reasons.push(`Есть подтверждённые достижения ФСП (${candidate.fspAchievementsCount})`);
  }

  return {
    score: Math.round(score * 10) / 10,
    breakdown,
    reasons,
  };
}
