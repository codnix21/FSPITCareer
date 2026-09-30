/** Общие константы весов matching — синхронизированы с backend engine */
export const MATCH_WEIGHTS = {
  roleMatch: 0.25,
  skillsMatch: 0.3,
  experienceMatch: 0.15,
  gradeMatch: 0.1,
  salaryMatch: 0.1,
  workFormatMatch: 0.05,
  fspMatch: 0.05,
} as const;
