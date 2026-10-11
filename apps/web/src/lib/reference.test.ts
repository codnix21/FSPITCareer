import { describe, expect, it } from 'vitest';
import { optionFromValue } from '@/lib/reference';

describe('reference helpers', () => {
  it('optionFromValue builds select option', () => {
    expect(optionFromValue('Python')).toEqual({ id: 'Python', label: 'Python', value: 'Python' });
    expect(optionFromValue('Backend Developer', 'Backend')).toEqual({
      id: 'Backend Developer',
      label: 'Backend',
      value: 'Backend Developer',
    });
  });
});
