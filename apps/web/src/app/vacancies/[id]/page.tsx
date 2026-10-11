'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBox, MatchBadge, SiteHeader, SkillChips, SkeletonCards, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { applicationStatusLabel, canWithdrawApplication, isActiveApplication } from '@/lib/applications-ui';
import { FORMAT_LABEL, formatSalary, GRADE_LABEL, SEMANTIC_SOURCE_LABEL, VACANCY_STATUS_LABEL } from '@/lib/labels';

export default function VacancyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [vacancy, setVacancy] = useState<any>(null);
  const [pair, setPair] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  const loadApplication = useCallback(async () => {
    const u = getStoredUser();
    if (u?.role !== 'CANDIDATE') return;
    try {
      const res = await api(`/applications/for-vacancy/${id}`);
      setApplication(res.application || null);
    } catch {
      setApplication(null);
    }
  }, [id]);

  useEffect(() => {
    setUser(getStoredUser());
    (async () => {
      try {
        const v = await api(`/vacancies/${id}`, { auth: false });
        setVacancy(v);

        const u = getStoredUser();
        if (u?.role === 'CANDIDATE') {
          try {
            const me = await api('/candidates/me');
            const p = await api(`/matching/pair?candidateId=${me.id}&vacancyId=${id}`);
            setPair(p);
          } catch {
            /* guest match unavailable */
          }
          await loadApplication();
        }
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить вакансию');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadApplication]);

  async function apply() {
    setBusy(true);
    setError('');
    setToast('');
    try {
      const created = await api('/applications', {
        method: 'POST',
        body: JSON.stringify({ vacancyId: id }),
      });
      setApplication(created);
      setToast('Отклик отправлен');
    } catch (e: any) {
      if (e instanceof ApiError && e.body?.code === 'APPLICATION_DUPLICATE') {
        setError('Отклик на эту вакансию уже отправлен');
        await loadApplication();
      } else {
        setError(e.message || 'Не удалось откликнуться');
      }
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!application?.id) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/applications/${application.id}/withdraw`, { method: 'POST', body: '{}' });
      setApplication(updated);
      setToast('Отклик отозван');
    } catch (e: any) {
      setError(e.message || 'Не удалось отозвать отклик');
    } finally {
      setBusy(false);
    }
  }

  const appliedActive = isActiveApplication(application?.status);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        {loading && <SkeletonCards count={2} />}
        {error && <ErrorBox message={error} />}
        {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

        {vacancy && (
          <article className="space-y-5">
            <div className="card">
              <p className="text-sm text-ink-500">
                <Link href={`/companies/${vacancy.company?.id}`} className="font-medium text-brand-700 hover:underline">
                  {vacancy.company?.name}
                </Link>
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold">{vacancy.title}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="badge bg-ink-50">{GRADE_LABEL[vacancy.grade]}</span>
                <span className="badge bg-ink-50">{FORMAT_LABEL[vacancy.workFormat]}</span>
                <span className="badge bg-ink-50">{formatSalary(vacancy.salaryFrom, vacancy.salaryTo)}</span>
                <span className="badge bg-ink-50">{VACANCY_STATUS_LABEL[vacancy.status]}</span>
              </div>
              <div className="mt-4">
                <SkillChips skills={(vacancy.skills || []).map((s: any) => s.skill.name)} />
              </div>
            </div>

            {pair && (
              <div className="card border border-brand-100 bg-brand-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Почему вы подходите</h2>
                  <MatchBadge score={pair.blendedScore || pair.matchScore} />
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-700">
                  {(pair.reasons || []).map((r: string) => (
                    <li key={r}>✓ {r}</li>
                  ))}
                </ul>
                {pair.semantic && (
                  <p className="mt-3 text-xs text-ink-500">
                    Семантическое сходство: {Math.round(pair.semantic.similarity * 100)}% (
                    {SEMANTIC_SOURCE_LABEL[pair.semantic.source] || 'Расчёт соответствия'})
                  </p>
                )}
              </div>
            )}

            <div className="card space-y-3">
              <h2 className="font-semibold">Описание</h2>
              <p className="text-sm leading-relaxed text-ink-700">{vacancy.description || 'Описание не указано'}</p>
              <h2 className="font-semibold">Требования</h2>
              <p className="text-sm leading-relaxed text-ink-700">{vacancy.requirements || 'Требования не указаны'}</p>
              <p className="text-sm text-ink-500">
                Опыт: от {vacancy.experienceFrom}
                {vacancy.experienceTo != null ? ` до ${vacancy.experienceTo}` : '+'} лет
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!user && (
                <Link href="/register" className="btn-primary">
                  Создать профиль соискателя
                </Link>
              )}
              {user?.role === 'CANDIDATE' && vacancy.status === 'ACTIVE' && (
                <>
                  {!application && (
                    <button type="button" className="btn-primary" disabled={busy} onClick={apply}>
                      {busy ? <Spinner /> : 'Откликнуться'}
                    </button>
                  )}
                  {application && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-brand-50 text-brand-800 ring-1 ring-brand-200">
                        {appliedActive ? 'Отклик отправлен' : applicationStatusLabel(application.status)}
                        {appliedActive ? ` · ${applicationStatusLabel(application.status)}` : ''}
                      </span>
                      {canWithdrawApplication(application.status) && (
                        <button type="button" className="btn-secondary" disabled={busy} onClick={withdraw}>
                          Отозвать отклик
                        </button>
                      )}
                      <Link href="/candidate/applications" className="btn-ghost">
                        Мои отклики
                      </Link>
                    </div>
                  )}
                </>
              )}
              {user?.role === 'EMPLOYER' && (
                <Link href={`/employer/search`} className="btn-primary">
                  Найти специалистов под вакансию
                </Link>
              )}
              <Link href="/vacancies" className="btn-secondary">
                Все вакансии
              </Link>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
