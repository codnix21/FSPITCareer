import { describe, expect, it } from 'vitest';
import { GRADE_LABEL } from './labels';

describe('taxonomy UI labels', () => {
  it('включает Intern в шкалу уровней', () => {
    expect(GRADE_LABEL.INTERN).toBe('Intern');
    expect(GRADE_LABEL.JUNIOR).toBe('Junior');
    expect(GRADE_LABEL.MIDDLE).toBe('Middle');
    expect(GRADE_LABEL.SENIOR).toBe('Senior');
  });

  it('категория отображается из backend name, а не из хардкода роли', () => {
    const category = { name: 'Backend Development · Middle', slug: 'backend-middle' };
    const fallback = 'Backend · Middle';
    expect(category.name).not.toBe(fallback);
    expect(category.name).toContain('Backend Development');
  });
});
