import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MatchBadge } from '@/components/ui';

describe('MatchBadge', () => {
  it('keeps one decimal place for 99.5', () => {
    render(<MatchBadge score={99.5} />);
    expect(screen.getByText('99.5% соответствия')).toBeTruthy();
  });

  it('does not round 99.5 to 100', () => {
    render(<MatchBadge score={99.5} size="lg" />);
    expect(screen.getByText('99.5%')).toBeTruthy();
    expect(screen.queryByText('100%')).toBeNull();
  });
});
