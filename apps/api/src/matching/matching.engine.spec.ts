import { calculateMatch } from './matching.engine';

describe('MatchingEngine', () => {
  it('даёт высокий score для идеального Backend-кандидата', () => {
    const result = calculateMatch(
      {
        id: '1',
        roleTitle: 'Backend Development',
        grade: 'MIDDLE',
        experienceYears: 3,
        salaryFrom: 200000,
        salaryTo: 250000,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
        fspAchievementsCount: 2,
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
      {
        roleTitle: 'Backend Development',
        grade: 'MIDDLE',
        experienceFrom: 2,
        experienceTo: 5,
        salaryFrom: 180000,
        salaryTo: 260000,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.breakdown.specializationMatch).toBe(1);
    expect(result.reasons.some((r) => r.includes('роль') || r.includes('Роль') || r.includes('технолог') || r.includes('специализац'))).toBe(true);
  });

  it('снижает score при несовпадении роли и стека', () => {
    const result = calculateMatch(
      {
        id: '2',
        roleTitle: 'Frontend Development',
        grade: 'JUNIOR',
        experienceYears: 1,
        workFormat: 'OFFICE',
        skills: ['React', 'CSS'],
        fspAchievementsCount: 0,
        specializationId: 'spec-fe',
        specializationSlug: 'frontend-development',
      },
      {
        roleTitle: 'Backend Development',
        grade: 'SENIOR',
        experienceFrom: 5,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
    );

    expect(result.score).toBeLessThan(50);
    expect(result.breakdown.specializationMatch).toBeLessThan(0.5);
  });

  it('не считает DevOps полноценным совпадением с Backend', () => {
    const result = calculateMatch(
      {
        id: '3',
        roleTitle: 'DevOps',
        grade: 'MIDDLE',
        experienceYears: 4,
        workFormat: 'REMOTE',
        skills: ['Docker', 'Kubernetes'],
        fspAchievementsCount: 0,
        specializationId: 'spec-do',
        specializationSlug: 'devops',
      },
      {
        roleTitle: 'Backend Development',
        grade: 'MIDDLE',
        experienceFrom: 2,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI'],
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
    );
    expect(result.breakdown.specializationMatch).toBeLessThanOrEqual(0.15);
  });

  it('использует recommendedGrade, а не self-declared для gradeMatch', () => {
    const high = calculateMatch(
      {
        id: '4',
        roleTitle: 'Backend Development',
        grade: 'SENIOR',
        recommendedGrade: 'MIDDLE',
        experienceYears: 3,
        workFormat: 'REMOTE',
        skills: ['Python'],
        fspAchievementsCount: 0,
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
        assessmentScore: 82,
      },
      {
        roleTitle: 'Backend Development',
        grade: 'MIDDLE',
        experienceFrom: 2,
        workFormat: 'REMOTE',
        skills: ['Python'],
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
    );
    const low = calculateMatch(
      {
        id: '5',
        roleTitle: 'Backend Development',
        grade: 'SENIOR',
        recommendedGrade: 'JUNIOR',
        experienceYears: 3,
        workFormat: 'REMOTE',
        skills: ['Python'],
        fspAchievementsCount: 0,
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
        assessmentScore: 55,
      },
      {
        roleTitle: 'Backend Development',
        grade: 'SENIOR',
        experienceFrom: 2,
        workFormat: 'REMOTE',
        skills: ['Python'],
        specializationId: 'spec-be',
        specializationSlug: 'backend-development',
      },
    );
    expect(high.breakdown.gradeMatch).toBeGreaterThan(low.breakdown.gradeMatch);
    expect(high.breakdown.assessmentMatch).toBeGreaterThan(0.5);
  });
});
