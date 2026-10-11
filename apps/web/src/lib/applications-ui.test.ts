import { describe, expect, it } from 'vitest';
import { applicationStatusLabel, canWithdrawApplication, isActiveApplication } from './applications-ui';

describe('applications UI helpers', () => {
  it('renders Russian statuses', () => {
    expect(applicationStatusLabel('SUBMITTED')).toBe('Отправлен');
    expect(applicationStatusLabel('REVIEWING')).toBe('На рассмотрении');
    expect(applicationStatusLabel('ACCEPTED')).toBe('Принят');
    expect(applicationStatusLabel('REJECTED')).toBe('Отклонён');
    expect(applicationStatusLabel('WITHDRAWN')).toBe('Отозван');
  });

  it('withdraw only for SUBMITTED/REVIEWING', () => {
    expect(canWithdrawApplication('SUBMITTED')).toBe(true);
    expect(canWithdrawApplication('REVIEWING')).toBe(true);
    expect(canWithdrawApplication('ACCEPTED')).toBe(false);
    expect(canWithdrawApplication('REJECTED')).toBe(false);
  });

  it('active application detection', () => {
    expect(isActiveApplication('SUBMITTED')).toBe(true);
    expect(isActiveApplication('WITHDRAWN')).toBe(false);
  });
});
