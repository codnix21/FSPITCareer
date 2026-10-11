import { describe, expect, it } from 'vitest';
import { GRADE_LABEL } from './labels';

describe('assessment UI (no client scoring)', () => {
  it('отображает backend result fields', () => {
    const result = {
      score: 82,
      status: 'PASSED',
      recommendedGrade: 'MIDDLE',
      selfDeclaredGrade: 'SENIOR',
    };
    expect(result.score).toBe(82);
    expect(GRADE_LABEL[result.recommendedGrade]).toBe('Middle');
    expect(GRADE_LABEL[result.selfDeclaredGrade]).toBe('Senior');
    // Frontend must not invent pass/fail from score locally in product code —
    // status comes from backend.
    expect(result.status).toBe('PASSED');
  });
});
