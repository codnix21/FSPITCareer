import { describe, it, expect } from 'vitest';
import { formatSalary, formatSalaryShort, OFFER_STATUS_LABEL, GRADE_LABEL, experienceLabel } from './labels';

describe('UI labels', () => {
  it('статусы предложений на русском', () => {
    expect(OFFER_STATUS_LABEL.PENDING).toBe('Ожидает ответа');
    expect(OFFER_STATUS_LABEL.ACCEPTED).toBe('Принято');
  });

  it('грейды на русском', () => {
    expect(GRADE_LABEL.MIDDLE).toBe('Мидл');
    expect(GRADE_LABEL.SENIOR).toBe('Сеньор');
  });

  it('форматирует опыт', () => {
    expect(experienceLabel(1)).toContain('год');
    expect(experienceLabel(3)).toContain('года');
  });

  it('короткая зарплата', () => {
    expect(formatSalaryShort(200000, 250000)).toContain('тыс');
    expect(formatSalary(100000, null)).toContain('от');
  });
});
