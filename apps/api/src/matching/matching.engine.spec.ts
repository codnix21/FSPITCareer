import { calculateMatch } from './matching.engine';

describe('MatchingEngine', () => {
  it('даёт высокий score для идеального Backend-кандидата', () => {
    const result = calculateMatch(
      {
        id: '1',
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceYears: 3,
        salaryFrom: 200000,
        salaryTo: 250000,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
        fspAchievementsCount: 2,
      },
      {
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceFrom: 2,
        experienceTo: 5,
        salaryFrom: 180000,
        salaryTo: 260000,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
      },
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons.some((r) => r.includes('роль') || r.includes('Роль') || r.includes('технолог'))).toBe(true);
  });

  it('снижает score при несовпадении роли и стека', () => {
    const result = calculateMatch(
      {
        id: '2',
        roleTitle: 'Frontend Developer',
        grade: 'JUNIOR',
        experienceYears: 1,
        workFormat: 'OFFICE',
        skills: ['React', 'CSS'],
        fspAchievementsCount: 0,
      },
      {
        roleTitle: 'Backend Developer',
        grade: 'SENIOR',
        experienceFrom: 5,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
      },
    );

    expect(result.score).toBeLessThan(50);
  });
});
