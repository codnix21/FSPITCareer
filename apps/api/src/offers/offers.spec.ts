import { calculateMatch } from '../matching/matching.engine';

describe('Offers + matching integration assumptions', () => {
  it('Иван Петров получает высокий score для демо-вакансии Backend', () => {
    const score = calculateMatch(
      {
        id: 'ivan',
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
    expect(score.score).toBeGreaterThanOrEqual(94);
  });
});
