export const CHALLENGE_DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Легко',
  MEDIUM: 'Средне',
  HARD: 'Сложно',
};

export type ChallengeCardStatus =
  | 'available'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'exhausted';

export function challengeDifficultyLabel(difficulty?: string | null) {
  if (!difficulty) return '—';
  return CHALLENGE_DIFFICULTY_LABEL[difficulty] || difficulty;
}

export function formatChallengeDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Без лимита';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} ч ${rem} мин` : `${h} ч`;
}

export function formatChallengeTimer(remainingSec: number) {
  const s = Math.max(0, Math.floor(remainingSec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function resolveChallengeCardStatus(input: {
  activeAttemptId?: string | null;
  attemptsUsed?: number;
  maxAttempts?: number;
  bestPassed?: boolean | null;
}): ChallengeCardStatus {
  if (input.activeAttemptId) return 'in_progress';
  const used = input.attemptsUsed ?? 0;
  const max = input.maxAttempts ?? 1;
  if (input.bestPassed === true) return 'passed';
  if (used >= max) return 'exhausted';
  if (input.bestPassed === false) return 'failed';
  return 'available';
}

export function challengeCardStatusLabel(status: ChallengeCardStatus) {
  switch (status) {
    case 'available':
      return 'Доступно';
    case 'in_progress':
      return 'В процессе';
    case 'passed':
      return 'Пройдено';
    case 'failed':
      return 'Не пройдено';
    case 'exhausted':
      return 'Попытки исчерпаны';
    default:
      return '—';
  }
}

export function challengeResultLabel(passed?: boolean | null) {
  if (passed === true) return 'Пройдено';
  if (passed === false) return 'Не пройдено';
  return '—';
}

export function canRetryChallenge(input: {
  attemptsUsed?: number;
  maxAttempts?: number;
  activeAttemptId?: string | null;
}) {
  if (input.activeAttemptId) return true;
  const used = input.attemptsUsed ?? 0;
  const max = input.maxAttempts ?? 1;
  return used < max;
}

export function challengeProgress(answered: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.min(answered, total) / total) * 100);
}

export function employerChallengeSummaryText(summary?: {
  passedCount?: number;
  totalSubmitted?: number;
} | null) {
  if (!summary || !summary.totalSubmitted) return 'Результатов заданий пока нет';
  return `Пройдено ${summary.passedCount ?? 0} из ${summary.totalSubmitted}`;
}
