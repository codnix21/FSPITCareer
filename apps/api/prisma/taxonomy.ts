/** Canonical IT taxonomy for seed / backfill */

export const INDUSTRY_IT = {
  slug: 'it',
  name: 'IT',
  description: 'Информационные технологии',
};

export const SPECIALIZATIONS = [
  { slug: 'backend-development', name: 'Backend Development', aliases: ['backend', 'backend developer', 'бэкенд'] },
  { slug: 'frontend-development', name: 'Frontend Development', aliases: ['frontend', 'frontend developer', 'фронтенд'] },
  { slug: 'mobile-development', name: 'Mobile Development', aliases: ['mobile', 'android', 'ios', 'mobile developer'] },
  { slug: 'devops', name: 'DevOps', aliases: ['devops', 'devops engineer', 'sre'] },
  { slug: 'qa-testing', name: 'QA / Testing', aliases: ['qa', 'qa engineer', 'тестировщик', 'quality assurance'] },
  { slug: 'data-engineering', name: 'Data Engineering', aliases: ['data engineer', 'data engineering'] },
  { slug: 'data-science', name: 'Data Science', aliases: ['data scientist', 'data science', 'аналитик данных'] },
  { slug: 'machine-learning', name: 'Machine Learning', aliases: ['ml', 'ml engineer', 'machine learning', 'инженер мл'] },
  { slug: 'cybersecurity', name: 'Cybersecurity', aliases: ['security', 'cybersecurity', 'информационная безопасность'] },
  { slug: 'ui-ux', name: 'UI/UX', aliases: ['ui', 'ux', 'ui/ux', 'designer', 'дизайнер'] },
  { slug: 'fullstack-development', name: 'Fullstack Development', aliases: ['fullstack', 'full stack', 'фулстек'] },
] as const;

export const GRADES_FOR_CATEGORY = ['INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD'] as const;

export const GRADE_LABEL_RU: Record<string, string> = {
  INTERN: 'Intern',
  JUNIOR: 'Junior',
  MIDDLE: 'Middle',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

/** Map free-text roleTitle → specialization slug */
export function mapRoleTitleToSpecializationSlug(roleTitle: string): string | null {
  const n = roleTitle.toLowerCase().trim();
  for (const s of SPECIALIZATIONS) {
    if (s.aliases.some((a) => n.includes(a) || a.includes(n))) return s.slug;
  }
  return null;
}
