'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, ProgressBar, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import {
  canRetryChallenge,
  challengeCardStatusLabel,
  challengeDifficultyLabel,
  challengeProgress,
  challengeResultLabel,
  formatChallengeDuration,
  formatChallengeTimer,
  resolveChallengeCardStatus,
} from '@/lib/challenges-ui';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

type View = 'list' | 'intro' | 'attempt' | 'result';

export default function CandidateChallengesPage() {
  const [view, setView] = useState<View>('list');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, r] = await Promise.all([api('/challenges'), api('/challenges/results/me')]);
      setChallenges(c.items || []);
      setResults(r.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить задания');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view !== 'attempt' || !attempt?.expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view, attempt?.expiresAt]);

  const remainingSec = useMemo(() => {
    if (!attempt?.expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - now) / 1000));
  }, [attempt?.expiresAt, now]);

  const answeredCount = useMemo(() => {
    if (!attempt?.questions) return 0;
    return attempt.questions.filter((q: any) => (q.selectedOptionIndexes || []).length > 0).length;
  }, [attempt?.questions]);

  async function openIntro(id: string) {
    setError('');
    setBusy(true);
    try {
      const detail = await api(`/challenges/${id}`);
      setSelected(detail);
      setView('intro');
    } catch (e: any) {
      setError(e.message || 'Не удалось открыть задание');
    } finally {
      setBusy(false);
    }
  }

  async function startChallenge() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const att = await api(`/challenges/${selected.id}/start`, { method: 'POST', body: '{}' });
      setAttempt(att);
      setCurrentIdx(0);
      setSubmitResult(null);
      setView('attempt');
    } catch (e: any) {
      setError(e?.body?.message || e.message || 'Не удалось начать задание');
    } finally {
      setBusy(false);
    }
  }

  async function selectAnswer(questionId: string, optionIndex: number, multi: boolean) {
    if (!attempt) return;
    const questions = attempt.questions.map((q: any) => {
      if (q.id !== questionId) return q;
      if (!multi) return { ...q, selectedOptionIndexes: [optionIndex] };
      const prev: number[] = q.selectedOptionIndexes || [];
      const set = new Set<number>(prev);
      if (set.has(optionIndex)) set.delete(optionIndex);
      else set.add(optionIndex);
      return { ...q, selectedOptionIndexes: [...set].sort((a, b) => a - b) };
    });
    const next = questions.find((q: any) => q.id === questionId);
    setAttempt({ ...attempt, questions });
    try {
      await api(`/challenges/attempts/${attempt.id}/answers`, {
        method: 'POST',
        body: JSON.stringify({
          questionId,
          selectedOptionIndexes: next?.selectedOptionIndexes || [],
        }),
      });
    } catch (e: any) {
      setError(e.message || 'Не удалось сохранить ответ');
    }
  }

  async function submitChallenge() {
    if (!attempt) return;
    setBusy(true);
    setError('');
    try {
      const res = await api(`/challenges/attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: '{}',
      });
      setSubmitResult(res);
      setView('result');
      setAttempt(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Не удалось завершить задание');
      if (String(e.message || '').includes('истекло')) {
        await load();
        setView('list');
      }
    } finally {
      setBusy(false);
    }
  }

  const currentQ = attempt?.questions?.[currentIdx];

  return (
    <AppShell nav={nav} title="Технические задания">
      {error && <ErrorBox message={error} onRetry={() => setError('')} />}

      {view === 'list' && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-950">Технические задания</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Регулярные проверки навыков. Не заменяют основное техническое тестирование и не меняют
              категорию автоматически.
            </p>
          </div>

          {loading ? (
            <SkeletonCards count={3} />
          ) : challenges.length === 0 ? (
            <EmptyState title="Нет доступных заданий" description="Опубликованные задания появятся здесь." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {challenges.map((ch) => {
                const status = resolveChallengeCardStatus(ch);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => openIntro(ch.id)}
                    className="card text-left transition hover:border-ink-300"
                    disabled={busy}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-semibold text-ink-950">{ch.title}</h2>
                      <span className="shrink-0 text-xs font-medium text-ink-600">
                        {challengeCardStatusLabel(status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-600">
                      {ch.specialization?.name || '—'} · {ch.skill?.name || '—'}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {challengeDifficultyLabel(ch.difficulty)} ·{' '}
                      {formatChallengeDuration(ch.timeLimitSeconds)} · попытки{' '}
                      {ch.attemptsUsed ?? 0}/{ch.maxAttempts ?? 1}
                    </p>
                    {ch.bestScore != null && (
                      <p className="mt-2 text-sm text-ink-700">Лучший результат: {ch.bestScore}/100</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {results.length > 0 && (
            <section className="card">
              <h3 className="section-title">История попыток</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {results.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-ink-100 py-2 last:border-0">
                    <span>{r.challenge?.title}</span>
                    <span>
                      {r.score != null ? `${r.score}/100` : '—'} · {challengeResultLabel(r.passed)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {view === 'intro' && selected && (
        <div className="mx-auto max-w-2xl space-y-6">
          <button type="button" className="text-sm text-ink-600 underline" onClick={() => setView('list')}>
            ← К списку
          </button>
          <div className="card">
            <h1 className="font-display text-3xl font-bold text-ink-950">{selected.title}</h1>
            <p className="mt-3 text-ink-700">{selected.description}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Специализация</dt>
                <dd className="font-medium">{selected.specialization?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Навык</dt>
                <dd className="font-medium">{selected.skill?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Сложность</dt>
                <dd className="font-medium">{challengeDifficultyLabel(selected.difficulty)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Лимит времени</dt>
                <dd className="font-medium">{formatChallengeDuration(selected.timeLimitSeconds)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Попытки</dt>
                <dd className="font-medium">
                  {selected.attemptsUsed ?? 0}/{selected.maxAttempts ?? 1}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Проходной балл</dt>
                <dd className="font-medium">{selected.passingScore}/100</dd>
              </div>
            </dl>
            <div className="mt-8">
              {canRetryChallenge(selected) || selected.activeAttemptId ? (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void startChallenge()}>
                  {busy ? <Spinner /> : selected.activeAttemptId ? 'Продолжить' : 'Начать задание'}
                </button>
              ) : (
                <p className="text-sm text-ink-600">Попытки исчерпаны</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'attempt' && attempt && currentQ && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              Вопрос {currentIdx + 1} из {attempt.questions.length}
            </p>
            {attempt.expiresAt && (
              <p className={`font-mono text-sm ${remainingSec <= 60 ? 'text-red-700' : 'text-ink-800'}`}>
                {formatChallengeTimer(remainingSec)}
              </p>
            )}
          </div>
          <ProgressBar value={challengeProgress(answeredCount, attempt.questions.length)} />
          <div className="card">
            <p className="text-lg font-medium text-ink-950">{currentQ.prompt}</p>
            <div className="mt-4 space-y-2">
              {currentQ.options.map((opt: string, idx: number) => {
                const multi = currentQ.type === 'MULTIPLE_CHOICE';
                const selectedOpts: number[] = currentQ.selectedOptionIndexes || [];
                const checked = selectedOpts.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`block w-full rounded-[10px] border px-4 py-3 text-left text-sm ${
                      checked ? 'border-ink-900 bg-ink-50' : 'border-ink-200'
                    }`}
                    onClick={() => void selectAnswer(currentQ.id, idx, multi)}
                    disabled={busy}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                Назад
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentIdx >= attempt.questions.length - 1}
                onClick={() => setCurrentIdx((i) => Math.min(attempt.questions.length - 1, i + 1))}
              >
                Далее
              </button>
              <button type="button" className="btn-primary ml-auto" disabled={busy} onClick={() => void submitChallenge()}>
                {busy ? <Spinner /> : 'Завершить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'result' && submitResult && (
        <div className="mx-auto max-w-xl space-y-6">
          <div className="card text-center">
            <h1 className="font-display text-3xl font-bold text-ink-950">Результат</h1>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-ink-950">
              {submitResult.score ?? '—'}/100
            </p>
            <p className="mt-2 text-lg">{challengeResultLabel(submitResult.passed)}</p>
            {submitResult.submittedAt && (
              <p className="mt-2 text-sm text-ink-500">
                {new Date(submitResult.submittedAt).toLocaleString('ru-RU')}
              </p>
            )}
            <p className="mt-4 text-sm text-ink-600">{submitResult.challenge?.title}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => setView('list')}>
                К списку заданий
              </button>
              {submitResult.challenge?.maxAttempts != null &&
                canRetryChallenge({
                  attemptsUsed: (selected?.attemptsUsed ?? 0) + 1,
                  maxAttempts: submitResult.challenge.maxAttempts,
                }) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (selected) void openIntro(selected.id);
                      else setView('list');
                    }}
                  >
                    Пройти ещё раз
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
