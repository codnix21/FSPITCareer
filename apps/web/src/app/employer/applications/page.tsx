'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, MatchBadge, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { applicationStatusLabel } from '@/lib/applications-ui';
import { GRADE_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

export default function EmployerApplicationsPage() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadVacancies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/vacancies/employer/mine');
      const list = res.items || [];
      setVacancies(list);
      if (list[0] && !selectedVacancyId) setSelectedVacancyId(list[0].id);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить вакансии');
    } finally {
      setLoading(false);
    }
  }, [selectedVacancyId]);

  const loadApps = useCallback(async (vacancyId: string) => {
    if (!vacancyId) {
      setItems([]);
      return;
    }
    setListLoading(true);
    setError('');
    try {
      const res = await api(`/vacancies/${vacancyId}/applications`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить отклики');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVacancies();
  }, [loadVacancies]);

  useEffect(() => {
    if (selectedVacancyId) void loadApps(selectedVacancyId);
  }, [selectedVacancyId, loadApps]);

  async function setStatus(id: string, status: 'REVIEWING' | 'ACCEPTED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api(`/applications/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadApps(selectedVacancyId);
    } catch (e: any) {
      setError(e.message || 'Не удалось обновить статус');
    } finally {
      setBusyId('');
    }
  }

  return (
    <AppShell title="Отклики" nav={employerNav}>
      {loading && <SkeletonCards />}
      {error && <ErrorBox message={error} onRetry={() => loadApps(selectedVacancyId)} />}

      {!loading && vacancies.length === 0 && (
        <EmptyState
          title="Нет вакансий"
          description="Создайте вакансию, чтобы получать отклики."
          action={
            <Link href="/employer/vacancies" className="btn-primary">
              Вакансии
            </Link>
          }
        />
      )}

      {vacancies.length > 0 && (
        <div className="mb-4">
          <label className="label" htmlFor="vac">
            Вакансия
          </label>
          <select
            id="vac"
            className="field max-w-xl"
            value={selectedVacancyId}
            onChange={(e) => setSelectedVacancyId(e.target.value)}
          >
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-ink-500">Откликов: {items.length}</p>
        </div>
      )}

      {listLoading && <Spinner label="Загрузка откликов" />}

      {!listLoading && selectedVacancyId && items.length === 0 && (
        <EmptyState title="Пока нет откликов" description="Когда кандидаты откликнутся, они появятся здесь." />
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <article key={a.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">
                  {a.candidate?.firstName} {a.candidate?.lastName}
                </h3>
                <p className="text-sm text-ink-600">
                  {a.candidate?.specialization?.name || a.candidate?.roleTitle} ·{' '}
                  {GRADE_LABEL[a.candidate?.recommendedGrade || a.candidate?.grade] || a.candidate?.grade}
                </p>
              </div>
              <span className="badge bg-ink-50">{applicationStatusLabel(a.status)}</span>
            </div>

            <p className="text-xs text-ink-500">
              Дата: {new Date(a.createdAt).toLocaleString('ru-RU')}
              {a.assessmentSummary ? ` · Тест: ${a.assessmentSummary.score}/100` : ''}
              {a.fspSummary || a.candidate?.fspSummary
                ? ` · ФСП: ${a.candidate?.fspSummary?.count ?? 0}`
                : ''}
            </p>

            {a.matchingSummary?.matchScore != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-600">Соответствие</span>
                <MatchBadge score={a.matchingSummary.matchScore} />
              </div>
            )}

            {a.contactAllowed && a.contact ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Контакт: {a.contact.email}
                {a.contact.phone ? ` · ${a.contact.phone}` : ''}
              </p>
            ) : (
              <p className="text-sm text-ink-500">Контакт скрыт политикой конфиденциальности</p>
            )}

            <div className="flex flex-wrap gap-2">
              {a.candidate?.id && (
                <Link href={`/employer/candidates/${a.candidate.id}`} className="btn-secondary">
                  Профиль
                </Link>
              )}
              {a.status === 'SUBMITTED' && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === a.id}
                  onClick={() => setStatus(a.id, 'REVIEWING')}
                >
                  Взять в работу
                </button>
              )}
              {(a.status === 'SUBMITTED' || a.status === 'REVIEWING') && (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busyId === a.id}
                    onClick={() => setStatus(a.id, 'ACCEPTED')}
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busyId === a.id}
                    onClick={() => setStatus(a.id, 'REJECTED')}
                  >
                    Отклонить
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
