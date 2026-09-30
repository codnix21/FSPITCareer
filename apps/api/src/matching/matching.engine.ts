export type Grade = 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD';
export type WorkFormat = 'REMOTE' | 'OFFICE' | 'HYBRID';

export interface MatchCandidateInput {
  id: string;
  roleTitle: string;
  grade: Grade;
  experienceYears: number;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  workFormat: WorkFormat;
  skills: string[];
  fspAchievementsCount: number;
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
}

export interface MatchBreakdown {
  roleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  gradeMatch: number;
  salaryMatch: number;
  workFormatMatch: number;
  fspMatch: number;
}

export interface MatchResult {
  score: number;
  breakdown: MatchBreakdown;
  reasons: string[];
}

const WEIGHTS = {
  roleMatch: 0.25,
  skillsMatch: 0.3,
  experienceMatch: 0.15,
  gradeMatch: 0.1,
  salaryMatch: 0.1,
  workFormatMatch: 0.05,
  fspMatch: 0.05,
};

const GRADE_RANK: Record<Grade, number> = {
  JUNIOR: 1,
  MIDDLE: 2,
  SENIOR: 3,
  LEAD: 4,
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function roleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const aliases: Record<string, string[]> = {
    backend: ['backend developer', 'бэкенд', 'backend'],
    frontend: ['frontend developer', 'фронтенд', 'frontend'],
    fullstack: ['fullstack developer', 'full stack', 'фулстек'],
    devops: ['devops engineer', 'devops'],
    'data scientist': ['data science', 'аналитик данных'],
    'ml engineer': ['machine learning', 'ml', 'инженер мл'],
    qa: ['qa engineer', 'тестировщик', 'quality assurance'],
    mobile: ['mobile developer', 'android', 'ios'],
    embedded: ['embedded developer', 'embedded'],
    'system administrator': ['sysadmin', 'системный администратор'],
  };

  for (const group of Object.values(aliases)) {
    const aHit = group.some((g) => na.includes(g) || g.includes(na));
    const bHit = group.some((g) => nb.includes(g) || g.includes(nb));
    if (aHit && bHit) return 0.9;
  }

  const aTokens = new Set(na.split(' '));
  const bTokens = new Set(nb.split(' '));
  let overlap = 0;
  for (const t of aTokens) if (bTokens.has(t)) overlap++;
  if (overlap === 0) return 0.2;
  return Math.min(1, 0.4 + (overlap / Math.max(aTokens.size, bTokens.size)) * 0.6);
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

  // Overlap of ranges
  const overlapStart = Math.max(cFrom, vFrom);
  const overlapEnd = Math.min(cTo, vTo);
  if (overlapStart <= overlapEnd) return 1;

  // Candidate asking more than vacancy offers
  if (cFrom > vTo) {
    const gap = (cFrom - vTo) / Math.max(vTo, 1);
    if (gap <= 0.1) return 0.8;
    if (gap <= 0.25) return 0.55;
    return 0.25;
  }

  // Candidate expecting less
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

/**
 * Рассчитывает соответствие кандидата требованиям вакансии (0–100).
 * Показатель означает соответствие конкретным требованиям, а не объективную ценность человека.
 */
export function calculateMatch(candidate: MatchCandidateInput, vacancy: MatchVacancyInput): MatchResult {
  const roleMatch = roleSimilarity(candidate.roleTitle, vacancy.roleTitle);
  const skills = skillsScore(candidate.skills, vacancy.skills);
  const experienceMatch = experienceScore(candidate.experienceYears, vacancy.experienceFrom, vacancy.experienceTo);
  const gradeMatch = gradeScore(candidate.grade, vacancy.grade);
  const salaryMatch = salaryScore(candidate.salaryFrom, candidate.salaryTo, vacancy.salaryFrom, vacancy.salaryTo);
  const workFormatMatch = workFormatScore(candidate.workFormat, vacancy.workFormat);
  const fspMatch = fspScore(candidate.fspAchievementsCount);

  const breakdown: MatchBreakdown = {
    roleMatch,
    skillsMatch: skills.score,
    experienceMatch,
    gradeMatch,
    salaryMatch,
    workFormatMatch,
    fspMatch,
  };

  const score =
    (breakdown.roleMatch * WEIGHTS.roleMatch +
      breakdown.skillsMatch * WEIGHTS.skillsMatch +
      breakdown.experienceMatch * WEIGHTS.experienceMatch +
      breakdown.gradeMatch * WEIGHTS.gradeMatch +
      breakdown.salaryMatch * WEIGHTS.salaryMatch +
      breakdown.workFormatMatch * WEIGHTS.workFormatMatch +
      breakdown.fspMatch * WEIGHTS.fspMatch) *
    100;

  const reasons: string[] = [];
  if (roleMatch >= 0.8) reasons.push('Совпадает профессиональная роль');
  else if (roleMatch >= 0.5) reasons.push('Роль близка к требуемой');

  if (skills.total > 0) {
    if (skills.matched === skills.total) reasons.push(`${skills.matched} из ${skills.total} ключевых технологий`);
    else if (skills.matched > 0) reasons.push(`Совпадает ${skills.matched} из ${skills.total} технологий`);
  }

  if (experienceMatch >= 0.85) reasons.push('Опыт соответствует или превышает требуемый');
  else if (experienceMatch >= 0.6) reasons.push('Опыт близок к требуемому');

  if (gradeMatch >= 0.85) reasons.push('Грейд соответствует требованиям');
  if (workFormatMatch >= 0.75) reasons.push('Подходит формат работы');
  if (salaryMatch >= 0.8) reasons.push('Зарплатные ожидания находятся в диапазоне');
  if (candidate.fspAchievementsCount > 0) {
    reasons.push('Есть подтверждённые достижения ФСП');
  }

  return {
    score: Math.round(score * 10) / 10,
    breakdown,
    reasons,
  };
}
