import { calculateMatch } from '../matching/matching.engine';

describe('Candidates matching scenarios', () => {
  it('фильтрует по наличию FSP в смысле score', () => {
    const withFsp = calculateMatch(
      {
        id: '1',
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceYears: 3,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
        fspAchievementsCount: 2,
      },
      {
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceFrom: 2,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
      },
    );
    const withoutFsp = calculateMatch(
      {
        id: '2',
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceYears: 3,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
        fspAchievementsCount: 0,
      },
      {
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceFrom: 2,
        workFormat: 'REMOTE',
        skills: ['Python', 'FastAPI', 'PostgreSQL'],
      },
    );
    expect(withFsp.score).toBeGreaterThan(withoutFsp.score);
  });
});
