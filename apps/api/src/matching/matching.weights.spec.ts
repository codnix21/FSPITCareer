import { MATCH_WEIGHTS, calculateMatch } from './matching.engine';

describe('Matching weights audit', () => {
  it('SUM(weights) === 1.0', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('documents Wave C formula components', () => {
    expect(MATCH_WEIGHTS).toEqual({
      roleMatch: 0.1,
      specializationMatch: 0.15,
      skillsMatch: 0.25,
      experienceMatch: 0.15,
      gradeMatch: 0.1,
      salaryMatch: 0.1,
      workFormatMatch: 0.05,
      fspMatch: 0.05,
      assessmentMatch: 0.05,
    });
  });

  it('assessment passed contributes higher assessmentMatch than missing', () => {
    const base = {
      id: '1',
      roleTitle: 'Backend Development',
      grade: 'MIDDLE' as const,
      recommendedGrade: 'MIDDLE' as const,
      experienceYears: 3,
      workFormat: 'REMOTE' as const,
      skills: ['Python'],
      fspAchievementsCount: 0,
      specializationId: 'be',
      specializationSlug: 'backend-development',
    };
    const vacancy = {
      roleTitle: 'Backend Development',
      grade: 'MIDDLE' as const,
      experienceFrom: 2,
      workFormat: 'REMOTE' as const,
      skills: ['Python'],
      specializationId: 'be',
      specializationSlug: 'backend-development',
    };
    const passed = calculateMatch({ ...base, assessmentScore: 85 }, vacancy);
    const failedLike = calculateMatch({ ...base, assessmentScore: 40 }, vacancy);
    expect(passed.breakdown.assessmentMatch).toBeGreaterThan(failedLike.breakdown.assessmentMatch);
  });
});
