import { describe, expect, it } from 'vitest';
import {
  canRetryChallenge,
  challengeCardStatusLabel,
  challengeDifficultyLabel,
  challengeProgress,
  challengeResultLabel,
  employerChallengeSummaryText,
  formatChallengeDuration,
  formatChallengeTimer,
  resolveChallengeCardStatus,
} from './challenges-ui';

describe('challenges UI — list & detail helpers', () => {
  it('challenge list status labels', () => {
    expect(challengeCardStatusLabel('available')).toBe('Доступно');
    expect(challengeCardStatusLabel('in_progress')).toBe('В процессе');
    expect(challengeCardStatusLabel('passed')).toBe('Пройдено');
    expect(challengeCardStatusLabel('failed')).toBe('Не пройдено');
    expect(challengeCardStatusLabel('exhausted')).toBe('Попытки исчерпаны');
  });

  it('challenge detail difficulty and duration', () => {
    expect(challengeDifficultyLabel('EASY')).toBe('Легко');
    expect(challengeDifficultyLabel('MEDIUM')).toBe('Средне');
    expect(challengeDifficultyLabel('HARD')).toBe('Сложно');
    expect(formatChallengeDuration(600)).toBe('10 мин');
    expect(formatChallengeDuration(null)).toBe('Без лимита');
  });

  it('start / resume resolution', () => {
    expect(resolveChallengeCardStatus({ activeAttemptId: 'a1' })).toBe('in_progress');
    expect(resolveChallengeCardStatus({ attemptsUsed: 0, maxAttempts: 2 })).toBe('available');
    expect(canRetryChallenge({ attemptsUsed: 0, maxAttempts: 2 })).toBe(true);
    expect(canRetryChallenge({ activeAttemptId: 'a1', attemptsUsed: 1, maxAttempts: 1 })).toBe(true);
  });

  it('active attempt and timer', () => {
    expect(formatChallengeTimer(125)).toBe('02:05');
    expect(formatChallengeTimer(0)).toBe('00:00');
    expect(formatChallengeTimer(-5)).toBe('00:00');
  });

  it('answer progress', () => {
    expect(challengeProgress(2, 4)).toBe(50);
    expect(challengeProgress(0, 4)).toBe(0);
    expect(challengeProgress(4, 4)).toBe(100);
  });

  it('submit / result labels', () => {
    expect(challengeResultLabel(true)).toBe('Пройдено');
    expect(challengeResultLabel(false)).toBe('Не пройдено');
    expect(challengeResultLabel(null)).toBe('—');
  });

  it('expired / exhausted states', () => {
    expect(
      resolveChallengeCardStatus({ attemptsUsed: 2, maxAttempts: 2, bestPassed: false }),
    ).toBe('exhausted');
    expect(
      resolveChallengeCardStatus({ attemptsUsed: 1, maxAttempts: 3, bestPassed: false }),
    ).toBe('failed');
    expect(
      resolveChallengeCardStatus({ attemptsUsed: 1, maxAttempts: 3, bestPassed: true }),
    ).toBe('passed');
    expect(canRetryChallenge({ attemptsUsed: 2, maxAttempts: 2 })).toBe(false);
  });

  it('loading / empty / error friendly copy via summary helper', () => {
    expect(employerChallengeSummaryText(null)).toBe('Результатов заданий пока нет');
    expect(employerChallengeSummaryText({ totalSubmitted: 0 })).toBe('Результатов заданий пока нет');
  });

  it('employer result summary', () => {
    expect(employerChallengeSummaryText({ passedCount: 2, totalSubmitted: 5 })).toBe(
      'Пройдено 2 из 5',
    );
  });
});
