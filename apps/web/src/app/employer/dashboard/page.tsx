'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, MatchBadge, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { GRADE_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

const nav = employerNav;

export default function EmployerDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [userName, setUserName] = useState('Алексей');
  const [matches, setMatches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentOffers, setRecentOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('fsp_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUserName(u.firstName || 'Алексей');
      } catch {}
    }

    (async () => {
      try {
        const [s, search, notes, offers] = await Promise.all([
          api('/vacancies/employer/stats'),
          api('/matching/search', {
            method: 'POST',
            body: JSON.stringify({
              roleTitle: 'Backend Developer',
              grade: 'MIDDLE',
              technologies: ['Python', 'FastAPI', 'PostgreSQL'],
              salaryFrom: 180000,
              salaryTo: 260000,
              workFormat: 'REMOTE',
              sortBy: 'match',
            }),
          }),
          api('/notifications'),
          api('/offers'),
        ]);
        setStats(s);
        setMatches(search.items?.slice(0, 5) || []);
        setNotifications(notes.items || []);
        setRecentOffers((offers.items || []).slice(0, 5));
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить панель');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell
      title={`Привет, ${userName}`}
      nav={nav}
      actions={
        <Link href="/employer/search" className="btn-primary !px-3 !py-2">
          Найти
        </Link>
      }
    >
      {loading && <Spinner label="Загрузка" />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="space-y-6">
          {notifications.length > 0 && (
            <section className="space-y-2">
              {notifications.map((n) => (
                <Link key={n.type} href={n.href || '/employer/offers'} className="block rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  <strong>{n.title}:</strong> {n.message}
                </Link>
              ))}
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Вакансии', value: stats?.activeVacancies ?? 0, href: '/employer/vacancies' },
              { label: 'Специалисты', value: stats?.foundCandidates ?? matches.length, href: '/employer/search' },
              { label: 'Офферы', value: stats?.sentOffers ?? 0, href: '/employer/offers' },
              { label: 'Ответы', value: stats?.responses ?? 0, href: '/employer/offers' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="card !py-4 transition hover:border-brand-300">
                <p className="text-xs font-medium text-ink-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-ink-900">{item.value}</p>
              </Link>
            ))}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Лучшие совпадения</h3>
              <Link href="/employer/search" className="text-sm font-semibold text-brand-700">
                Весь поиск
              </Link>
            </div>
            {matches.length === 0 ? (
              <EmptyState
                title="Пока пусто"
                description="Откройте поиск — система подберёт специалистов."
                action={
                  <Link href="/employer/search" className="btn-primary">
                    Найти специалистов
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {matches.map((m) => (
                  <article key={m.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">
                          {m.firstName} {m.lastName}
                        </h4>
                        <MatchBadge score={m.matchScore} />
                      </div>
                      <p className="mt-1 text-sm text-ink-600">
                        {m.roleTitle} · {GRADE_LABEL[m.grade]}
                      </p>
                      <div className="mt-2">
                        <SkillChips skills={m.skills.map((s: any) => s.name).slice(0, 5)} />
                      </div>
                    </div>
                    <Link href={`/employer/candidates/${m.id}`} className="btn-primary shrink-0">
                      Открыть
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          {recentOffers.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Недавние предложения</h3>
                <Link href="/employer/offers" className="text-sm font-semibold text-brand-700">
                  Все
                </Link>
              </div>
              <div className="grid gap-2">
                {recentOffers.map((o) => (
                  <div key={o.id} className="card flex flex-wrap items-center justify-between gap-2 !py-3">
                    <p className="text-sm">
                      <strong>
                        {o.candidate?.firstName} {o.candidate?.lastName}
                      </strong>{' '}
                      · {o.vacancy?.title}
                    </p>
                    <span className="badge bg-ink-50 text-ink-700">
                      {o.status === 'PENDING' ? 'Ожидает' : o.status === 'ACCEPTED' ? 'Принято' : o.status === 'REJECTED' ? 'Отклонено' : 'Отозвано'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
