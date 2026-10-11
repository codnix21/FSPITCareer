'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, EmptyState, ErrorBox, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { GRADE_LABEL, OFFER_STATUS_LABEL, roleDisplay, VACANCY_STATUS_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

export default function EmployerDashboardPage() {
  const [userName, setUserName] = useState('');
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('fsp_user');
    if (raw) {
      try {
        setUserName(JSON.parse(raw).firstName || '');
      } catch {
        /* ignore */
      }
    }

    (async () => {
      try {
        const [mine, offs] = await Promise.all([api('/vacancies/employer/mine'), api('/offers')]);
        const items = mine.items || [];
        setVacancies(items);
        setOffers(offs.items || []);

        const active = items.filter((v: any) => v.status === 'ACTIVE').slice(0, 5);
        const counts: Record<string, number> = {};
        await Promise.all(
          active.map(async (v: any) => {
            try {
              const res = await api(`/matching/vacancies/${v.id}`);
              counts[v.id] = res.total ?? res.items?.length ?? 0;
            } catch {
              counts[v.id] = 0;
            }
          }),
        );
        setMatchCounts(counts);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить панель');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingOffers = offers.filter((o) => o.status === 'PENDING').length;
  const newMatches = Object.values(matchCounts).reduce((a, b) => a + b, 0);

  return (
    <AppShell title={userName ? `Добрый день, ${userName}` : 'Главная'} nav={employerNav}>
      {loading && <Spinner label="Загрузка" />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && (
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-xl border border-ink-950/8 bg-ink-950 px-6 py-9 text-white md:px-8">
            <p className="text-sm text-white/55">Что сделать сейчас</p>
            <h2 className="mt-2 max-w-lg font-display text-2xl font-bold tracking-tight md:text-3xl">Найдите специалиста</h2>
            <p className="mt-3 max-w-md text-sm text-white/65">
              Опишите роль, уровень и технологии — система подберёт кандидатов и объяснит соответствие.
            </p>
            <Link href="/employer/search" className="btn-primary mt-6 inline-flex !px-8 !py-3 text-base">
              Найти специалиста
            </Link>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">Ваши вакансии</h3>
              <Link href="/employer/vacancies" className="text-sm font-semibold text-brand-700">
                Все вакансии
              </Link>
            </div>
            {vacancies.length === 0 ? (
              <EmptyState
                title="У вас пока нет вакансий"
                description="Создайте первую вакансию, чтобы найти подходящих IT-специалистов."
                action={
                  <Link href="/employer/vacancies" className="btn-primary">
                    Создать вакансию
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {vacancies.slice(0, 5).map((v) => (
                  <article key={v.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{v.title}</h4>
                        <span className="badge bg-ink-50 text-ink-700">{VACANCY_STATUS_LABEL[v.status] || v.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-ink-600">
                        {roleDisplay(v.roleTitle)} · {GRADE_LABEL[v.grade]}
                      </p>
                      {v.status === 'ACTIVE' && (
                        <p className="mt-2 text-sm font-medium text-brand-800">
                          {matchCounts[v.id] != null
                            ? (() => {
                                const n = matchCounts[v.id];
                                const word = n === 1 ? 'подходящий специалист' : n < 5 ? 'подходящих специалиста' : 'подходящих специалистов';
                                return `${n} ${word}`;
                              })()
                            : 'Считаем совпадения…'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {v.status === 'ACTIVE' && (
                        <Link href={`/employer/search?vacancyId=${v.id}`} className="btn-primary">
                          Посмотреть специалистов
                        </Link>
                      )}
                      <Link href="/employer/vacancies" className="btn-secondary">
                        Открыть
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-950/10 bg-white px-5 py-4">
              <p className="text-sm text-ink-500">Новых подходящих специалистов</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink-900">{newMatches}</p>
            </div>
            <div className="rounded-xl border border-ink-950/10 bg-white px-5 py-4">
              <p className="text-sm text-ink-500">Ожидают ответа</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink-900">{pendingOffers}</p>
              <Link href="/employer/offers" className="mt-2 inline-block text-sm font-semibold text-brand-700">
                Посмотреть предложения
              </Link>
            </div>
          </section>

          {offers.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-lg font-bold">Недавние предложения</h3>
              <div className="grid gap-2">
                {offers.slice(0, 4).map((o) => (
                  <div key={o.id} className="card flex flex-wrap items-center justify-between gap-2 !py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {o.candidate?.firstName} {o.candidate?.lastName}
                      </p>
                      <p className="text-sm text-ink-600">{o.vacancy?.title}</p>
                    </div>
                    <span className="badge bg-ink-50 text-ink-700">{OFFER_STATUS_LABEL[o.status]}</span>
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
