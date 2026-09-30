import { calculateMatch } from '../matching/matching.engine';

describe('Vacancy matching', () => {
  it('учитывает требования вакансии Backend Middle', () => {
    const result = calculateMatch(
      {
        id: 'v',
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
        salaryFrom: 200000,
        salaryTo: 250000,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
      },
    );
    expect(result.score).toBeGreaterThanOrEqual(94);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
