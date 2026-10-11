'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, ProgressBar, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { GRADE_LABEL } from '@/lib/labels';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

type View = 'list' | 'intro' | 'attempt' | 'result';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m} мин`;
}

function formatRetry(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch {
    return iso;
  }
}

export default function CandidateTestsPage() {
  const [view, setView] = useState<View>('list');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [profile, setProfile] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, r, p] = await Promise.all([
        api('/assessments'),
        api('/assessments/results/me'),
        api('/candidates/me').catch(() => null),
      ]);
      setAssessments(a.items || []);
      setResults(r.items || []);
      setProfile(p);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить тестирование');
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

  async function openIntro(id: string) {
    setError('');
    setBusy(true);
    try {
      const detail = await api(`/assessments/${id}`);
      setSelected(detail);
      setView('intro');
    } catch (e: any) {
      setError(e.message || 'Не удалось открыть тест');
    } finally {
      setBusy(false);
    }
  }

  async function startTest() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const att = await api(`/assessments/${selected.id}/start`, { method: 'POST', body: '{}' });
      setAttempt(att);
      setCurrentIdx(0);
      setSubmitResult(null);
      setView('attempt');
    } catch (e: any) {
      const msg = e?.body?.message || e.message || 'Не удалось начать тест';
      const retry = e?.body?.retryAt;
      setError(retry ? `${msg}. Повторная попытка доступна: ${formatRetry(retry)}` : msg);
    } finally {
      setBusy(false);
    }
  }

  async function selectAnswer(questionId: string, optionIndex: number) {
    if (!attempt) return;
    const questions = attempt.questions.map((q: any) =>
      q.id === questionId ? { ...q, selectedOptionIndexes: [optionIndex] } : q,
    );
    setAttempt({ ...attempt, questions });
    try {
      await api(`/assessments/attempts/${attempt.id}/answers`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOptionIndexes: [optionIndex] }),
      });
    } catch (e: any) {
      setError(e.message || 'Не удалось сохранить ответ');
    }
  }

  async function submitTest() {
    if (!attempt) return;
    setBusy(true);
    setError('');
    try {
      const res = await api(`/assessments/attempts/${attempt.id}/submit`, { method: 'POST', body: '{}' });
      setSubmitResult(res);
      setView('result');
      setAttempt(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Не удалось завершить тест');
    } finally {
      setBusy(false);
    }
  }

  const latestPassed = results.find((r) => r.status === 'PASSED');
  const assessmentStatusLabel =
    profile?.profileStatus === 'AVAILABLE' && latestPassed
      ? 'Пройдено'
      : profile?.profileStatus === 'ASSESSMENT_REQUIRED'
        ? 'Не пройдено'
        : results.length
          ? 'Можно пройти повторно после паузы'
          : 'Можно пройти';

  return (
    <AppShell title="Техническое тестирование" nav={nav}>
      {loading && <SkeletonCards />}
      {error && <ErrorBox message={error} onRetry={() => setError('')} />}

      {!loading && view === 'list' && (
        <div className="space-y-6">
          <section className="card">
            <h2 className="font-display text-xl font-bold">Статус</h2>
            <p className="mt-2 text-sm text-ink-600">
              Техническое тестирование подтверждает уровень по выбран специализации. Результат рассчитывается на сервере и
              влияет на категорию специалиста и доступность для работодателей.
            </p>
            <p className="mt-3 text-sm font-semibold text-ink-900">Статус: {assessmentStatusLabel}</p>
            {profile?.recommendedGrade && (
              <p className="mt-1 text-sm text-ink-600">
                Рекомендуемый уровень: {GRADE_LABEL[profile.recommendedGrade] || profile.recommendedGrade}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Доступные тесты</h2>
            {assessments.length === 0 ? (
              <EmptyState
                title="Нет доступных тестов"
                description="Завершите онбординг и укажите специализацию — затем появится подходящий тест."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {assessments.map((t) => (
                  <article key={t.id} className="card">
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-ink-500">{t.description}</p>
                    <p className="mt-2 text-xs text-ink-400">
                      {t.questionCount} вопросов · {formatDuration(t.timeLimitSeconds)} · проходной балл {t.passingScore}
                    </p>
                    <button type="button" className="btn-primary mt-4" disabled={busy} onClick={() => openIntro(t.id)}>
                      {latestPassed ? 'Пройти снова' : 'Пройти тест'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Мои результаты</h2>
            {results.length === 0 ? (
              <EmptyState title="Нет результатов" description="Пройдите тест, чтобы подтвердить компетенции." />
            ) : (
              <div className="space-y-3">
                {results.map((r) => (
                  <div key={r.id} className="card">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium">{r.assessment?.name}</span>
                      <span>
                        {r.score}/100 · {r.status === 'PASSED' ? 'Пройдено' : 'Не пройдено'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      Рекомендуемый уровень: {GRADE_LABEL[r.recommendedGrade] || r.recommendedGrade}
                      {r.category?.name ? ` · Категория: ${r.category.name}` : ''}
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={r.score} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && view === 'intro' && selected && (
        <div className="card max-w-2xl space-y-4">
          <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
          <p className="text-sm text-ink-600">{selected.description}</p>
          <ul className="space-y-1 text-sm text-ink-800">
            <li>Специализация: {selected.specialization?.name}</li>
            <li>Количество вопросов: {selected.questionCount}</li>
            <li>Время: {formatDuration(selected.timeLimitSeconds)}</li>
            <li>Минимальный результат: {selected.passingScore}%</li>
            <li>Повторная попытка: через {selected.cooldownHours} ч после завершения</li>
          </ul>
          <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
            <p className="font-semibold">Правила</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Ответы сохраняются на сервере; результат считает backend.</li>
              <li>После истечения времени попытка завершается автоматически.</li>
              <li>Рекомендуемый уровень определяется по порогам теста, не по заявленному уровню.</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={startTest}>
              {busy ? <Spinner /> : 'Начать тест'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setView('list')}>
              Назад
            </button>
          </div>
        </div>
      )}

      {!loading && view === 'attempt' && attempt && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{attempt.assessment?.name || 'Попытка'}</h2>
              <p className="text-sm text-ink-500">
                Вопрос {currentIdx + 1} из {attempt.questions?.length || 0}
              </p>
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${remainingSec < 60 ? 'bg-red-50 text-red-800' : 'bg-ink-50 text-ink-800'}`}>
              Осталось: {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
            </div>
          </div>
          <ProgressBar value={((currentIdx + 1) / Math.max(attempt.questions?.length || 1, 1)) * 100} />

          {attempt.questions?.[currentIdx] && (
            <fieldset className="rounded-xl bg-ink-50 p-4">
              <legend className="font-medium">
                {attempt.questions[currentIdx].number}. {attempt.questions[currentIdx].text}
              </legend>
              <div className="mt-3 space-y-2">
                {attempt.questions[currentIdx].options.map((opt: string, oi: number) => (
                  <label key={oi} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${attempt.questions[currentIdx].id}`}
                      checked={(attempt.questions[currentIdx].selectedOptionIndexes || [])[0] === oi}
                      onChange={() => selectAnswer(attempt.questions[currentIdx].id, oi)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            >
              Назад
            </button>
            {currentIdx < (attempt.questions?.length || 1) - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setCurrentIdx((i) => i + 1)}>
                Далее
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={busy} onClick={submitTest}>
                {busy ? 'Проверка…' : 'Завершить тест'}
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && view === 'result' && submitResult && (
        <div className="card max-w-2xl space-y-4">
          <h2 className="font-display text-2xl font-bold">Результат</h2>
          <p className="text-lg font-semibold">
            {submitResult.score}/100 · {submitResult.status === 'PASSED' ? 'Пройдено' : 'Не пройдено'}
          </p>
          <ProgressBar value={submitResult.score} />
          <div className="space-y-1 text-sm text-ink-800">
            <p>Заявленный уровень: {GRADE_LABEL[submitResult.selfDeclaredGrade] || submitResult.selfDeclaredGrade}</p>
            <p>Результат тестирования: {GRADE_LABEL[submitResult.recommendedGrade] || submitResult.recommendedGrade}</p>
            <p>Рекомендованный уровень: {GRADE_LABEL[submitResult.recommendedGrade] || submitResult.recommendedGrade}</p>
            {submitResult.status === 'PASSED' ? (
              <p className="text-emerald-800">Профиль доступен работодателям (категория обновлена по результату теста).</p>
            ) : (
              <p className="text-amber-800">
                Проходной балл — {submitResult.passingScore}. Повторная попытка будет доступна после паузы.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setView('list');
              setSubmitResult(null);
            }}
          >
            К списку тестов
          </button>
        </div>
      )}
    </AppShell>
  );
}
