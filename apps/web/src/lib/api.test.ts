import { describe, expect, it } from 'vitest';
import { humanizeApiMessage } from './api';

describe('humanizeApiMessage', () => {
  it('keeps intentional Russian API messages', () => {
    expect(humanizeApiMessage('Попытки исчерпаны')).toBe('Попытки исчерпаны');
    expect(humanizeApiMessage('Подтвердите email, чтобы продолжить')).toBe(
      'Подтвердите email, чтобы продолжить',
    );
  });

  it('hides Prisma / technical internals from users', () => {
    expect(humanizeApiMessage('Unique constraint failed on the fields: (`candidateId`) P2002')).toBe(
      'Не удалось выполнить действие. Попробуйте ещё раз',
    );
    expect(humanizeApiMessage('PrismaClientKnownRequestError')).toBe(
      'Не удалось выполнить действие. Попробуйте ещё раз',
    );
    expect(humanizeApiMessage('Cannot read properties of undefined')).toBe(
      'Не удалось выполнить действие. Попробуйте ещё раз',
    );
    expect(humanizeApiMessage('Internal Server Error')).toBe('Внутренняя ошибка сервера');
  });
});
