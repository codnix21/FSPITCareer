import { describe, it, expect } from 'vitest';
import { formatSalary, OFFER_STATUS_LABEL, ROLE_LABEL, VACANCY_STATUS_LABEL } from './labels';

describe('Русский UI-словарь', () => {
  it('роли пользователей на русском', () => {
    expect(ROLE_LABEL.CANDIDATE).toBe('Соискатель');
    expect(ROLE_LABEL.EMPLOYER).toBe('Работодатель');
    expect(ROLE_LABEL.ADMIN).toBe('Администратор');
  });

  it('статусы вакансий на русском', () => {
    expect(VACANCY_STATUS_LABEL.ACTIVE).toBe('Активна');
    expect(VACANCY_STATUS_LABEL.CLOSED).toBe('Закрыта');
  });

  it('статусы предложений на русском', () => {
    expect(OFFER_STATUS_LABEL.WITHDRAWN).toBe('Отозвано');
  });

  it('зарплата без верхней границы', () => {
    expect(formatSalary(180000, undefined)).toContain('от');
  });
});
