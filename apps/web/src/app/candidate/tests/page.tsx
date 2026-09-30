'use client';

import { useEffect, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, ProgressBar, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

export default function CandidateTestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([api('/tests'), api('/tests/attempts/me')]);
      setTests(t.items || []);
      setAttempts(a || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openTest(id: string) {
    setResult(null);
    const test = await api(`/tests/${id}`);
    setActive(test);
    setAnswers(test.questions.map(() => 0));
  }

  async function submit() {
    if (!active) return;
    setSubmitting(true);
    try {
      const res = await api(`/tests/${active.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setResult(res);
      setActive(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Не удалось отправить ответы');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Тесты компетенций" nav={nav}>
      {loading && <SkeletonCards />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {result && (
        <div className="mb-4 card border border-brand-100 bg-brand-50">
          <p className="font-semibold">Тест завершён</p>
          <p className="mt-1 text-sm">
            Результат: {result.score} из 100 ({result.correct} из {result.total} верных)
          </p>
          <div className="mt-3">
            <ProgressBar value={result.score} />
          </div>
        </div>
      )}

      {active ? (
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{active.title}</h2>
              <p className="text-sm text-ink-500">{active.description}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setActive(null)}>
              Отмена
            </button>
          </div>
          {active.questions.map((q: any, qi: number) => (
            <fieldset key={q.id} className="rounded-xl bg-ink-50 p-4">
              <legend className="font-medium">
                {qi + 1}. {q.question}
              </legend>
              <div className="mt-3 space-y-2">
                {q.options.map((opt: string, oi: number) => (
                  <label key={oi} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => {
                        const next = [...answers];
                        next[qi] = oi;
                        setAnswers(next);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="button" className="btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? 'Проверка…' : 'Отправить ответы'}
          </button>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 font-semibold">Доступные тесты</h2>
              {tests.length === 0 ? (
                <EmptyState title="Нет тестов" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {tests.map((t) => (
                    <article key={t.id} className="card">
                      <h3 className="font-semibold">{t.title}</h3>
                      <p className="mt-1 text-sm text-ink-500">{t.description}</p>
                      <p className="mt-2 text-xs text-ink-400">Вопросов: {t._count?.questions ?? '—'}</p>
                      <button type="button" className="btn-primary mt-4" onClick={() => openTest(t.id)}>
                        Пройти тест
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">Мои результаты</h2>
              {attempts.length === 0 ? (
                <EmptyState title="Нет результатов" description="Пройдите тест, чтобы подтвердить компетенции." />
              ) : (
                <div className="space-y-3">
                  {attempts.map((a) => (
                    <div key={a.id} className="card">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{a.test?.title}</span>
                        <span>
                          {a.score}/{a.maxScore}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={a.score} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      )}
    </AppShell>
  );
}
