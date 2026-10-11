'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { applicationStatusLabel, canWithdrawApplication } from '@/lib/applications-ui';
import { candidateNav } from '@/lib/nav';

export default function CandidateApplicationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/applications/me');
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить отклики');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(id: string) {
    setBusyId(id);
    try {
      await api(`/applications/${id}/withdraw`, { method: 'POST', body: '{}' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Не удалось отозвать отклик');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell title="Мои отклики" nav={candidateNav}>
      {loading && <SkeletonCards />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Откликов пока нет"
          description="Найдите подходящую вакансию и нажмите «Откликнуться»."
          action={
            <Link href="/vacancies" className="btn-primary">
              Смотреть вакансии
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <article key={a.id} className="card space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{a.vacancy?.title || 'Вакансия'}</h3>
                <p className="text-sm text-ink-600">{a.vacancy?.company?.name || 'Компания'}</p>
              </div>
              <span className="badge bg-ink-50">{applicationStatusLabel(a.status)}</span>
            </div>
            <p className="text-xs text-ink-500">
              Дата отклика: {new Date(a.createdAt).toLocaleString('ru-RU')}
              {a.updatedAt ? ` · Изменён: ${new Date(a.updatedAt).toLocaleString('ru-RU')}` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/vacancies/${a.vacancyId}`} className="btn-secondary">
                Открыть
              </Link>
              {canWithdrawApplication(a.status) && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busyId === a.id}
                  onClick={() => withdraw(a.id)}
                >
                  {busyId === a.id ? <Spinner /> : 'Отозвать'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
