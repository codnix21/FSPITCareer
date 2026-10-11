'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell, ConfirmDialog, EmptyState, ErrorBox, MatchBadge, MatchExplain, ProgressBar, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatSalary, FORMAT_LABEL, OFFER_STATUS_LABEL, roleDisplay } from '@/lib/labels';
import { candidateNav } from '@/lib/nav';

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [acceptedCompany, setAcceptedCompany] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; status: 'ACCEPTED' | 'REJECTED'; title: string; company: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const raw = localStorage.getItem('fsp_user');
      if (raw) {
        try {
          setUserName(JSON.parse(raw).firstName || '');
        } catch {
          /* ignore */
        }
      }
      const me = await api('/candidates/me');
      setProfile(me);
      const [matched, offs] = await Promise.all([
        api(`/matching/candidates/${me.id}/vacancies`),
        api('/offers'),
      ]);
      setVacancies(matched.items || []);
      setOffers(offs.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить панель');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const completeness = useMemo(() => {
    if (!profile) return 0;
    let score = 40;
    if (profile.skills?.length >= 3) score += 15;
    if (profile.skills?.length >= 5) score += 5;
    if (profile.experiences?.length) score += 15;
    if (profile.educations?.length) score += 10;
    if (profile.resumes?.length) score += 10;
    if (profile.achievements?.length) score += 5;
    if (profile.assessment?.status === 'PASSED' || profile.profileStatus === 'AVAILABLE') score += 5;
    return Math.min(100, score);
  }, [profile]);

  const todos = useMemo(() => {
    if (!profile) return [];
    const list: string[] = [];
    if (!profile.educations?.length) list.push('образование');
    if ((profile.skills?.length || 0) < 5) list.push(`ещё ${Math.max(1, 5 - (profile.skills?.length || 0))} навыка`);
    if (profile.profileStatus === 'ASSESSMENT_REQUIRED' || profile.assessment?.status !== 'PASSED') {
      list.push('техническое тестирование');
    }
    if (!profile.resumes?.length) list.push('резюме');
    return list;
  }, [profile]);

  async function respond() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await api(`/offers/${confirm.id}`, { method: 'PATCH', body: JSON.stringify({ status: confirm.status }) });
      if (confirm.status === 'ACCEPTED') {
        setAcceptedCompany(confirm.company);
        setToast('Предложение принято');
      } else {
        setToast('Предложение отклонено');
      }
      setConfirm(null);
      await load();
    } catch (e: any) {
      setToast(e.message || 'Не удалось обновить предложение');
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  const pendingOffers = offers.filter((o) => o.status === 'PENDING');

  return (
    <AppShell title={userName ? `Добрый день, ${userName}` : 'Главная'} nav={candidateNav}>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {acceptedCompany && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950">
          <h2 className="font-display text-xl font-bold">Предложение принято</h2>
          <p className="mt-2 text-sm">Компания {acceptedCompany} получила ваш ответ.</p>
          <p className="mt-2 text-sm font-medium">
            Следующий шаг: свяжитесь с представителем компании для дальнейшего обсуждения.
          </p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setAcceptedCompany('')}>
            Понятно
          </button>
        </div>
      )}

      {!loading && !error && profile && (
        <div className="space-y-8">
          <section className="rounded-xl border border-ink-950/10 bg-white px-5 py-5">
            <p className="text-sm text-ink-500">Ваш профиль заполнен на {completeness}%</p>
            <div className="mt-3">
              <ProgressBar value={completeness} />
            </div>
            {todos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-700">Рекомендации</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
                  {(profile.skills?.length || 0) < 5 && <li>○ Добавьте навыки</li>}
                  {(profile.profileStatus === 'ASSESSMENT_REQUIRED' || profile.assessment?.status !== 'PASSED') && (
                    <li>○ Пройдите техническое тестирование</li>
                  )}
                  {!profile.resumes?.length && <li>○ Загрузите резюме</li>}
                  {!profile.educations?.length && <li>○ Укажите образование</li>}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(profile.profileStatus === 'ASSESSMENT_REQUIRED' || profile.assessment?.status !== 'PASSED') && (
                    <Link href="/candidate/tests" className="btn-primary">
                      Пройти тест
                    </Link>
                  )}
                  <Link href="/candidate/profile" className="btn-secondary">
                    Дополнить профиль
                  </Link>
                </div>
              </div>
            )}
          </section>

          {pendingOffers.length > 0 && (
            <section className="relative overflow-hidden border border-brand-200 bg-brand-50/80 px-6 py-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-800">У вас новое предложение</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink-950">
                {pendingOffers[0].company?.name}
              </h2>
              <p className="mt-2 text-sm text-ink-700">{pendingOffers[0].vacancy?.title}</p>
              <p className="mt-1 text-sm text-ink-600">
                {pendingOffers[0].salary
                  ? `${new Intl.NumberFormat('ru-RU').format(pendingOffers[0].salary)} ₽`
                  : formatSalary(pendingOffers[0].vacancy?.salaryFrom, pendingOffers[0].vacancy?.salaryTo)}
                {' · '}
                {FORMAT_LABEL[pendingOffers[0].workFormat || pendingOffers[0].vacancy?.workFormat] || ''}
              </p>
              <a href="#offers" className="btn-primary mt-5 inline-flex">
                Посмотреть предложение
              </a>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-3">
            <a href="#vacancies" className="rounded-xl border border-ink-950/10 bg-white px-4 py-4 transition hover:border-brand-300">
              <p className="text-sm text-ink-500">Подходящие вакансии</p>
              <p className="mt-1 font-display text-3xl font-bold">{vacancies.length}</p>
            </a>
            <a href="#offers" className="rounded-xl border border-ink-950/10 bg-white px-4 py-4 transition hover:border-brand-300">
              <p className="text-sm text-ink-500">Новые предложения</p>
              <p className="mt-1 font-display text-3xl font-bold">{pendingOffers.length}</p>
            </a>
            <Link href="/candidate/profile#achievements" className="rounded-xl border border-ink-950/10 bg-white px-4 py-4 transition hover:border-brand-300">
              <p className="text-sm text-ink-500">Достижения ФСП</p>
              <p className="mt-1 font-display text-3xl font-bold">{profile.achievements?.length || 0}</p>
            </Link>
          </section>

          {pendingOffers.length === 0 && (
            <section className="relative overflow-hidden rounded-2xl border border-ink-950/10 bg-ink-950 px-6 py-8 text-white">
              <h2 className="font-display text-xl font-bold md:text-2xl">Посмотреть подходящие вакансии</h2>
              <p className="mt-2 max-w-md text-sm text-white/70">Система уже сопоставила ваш профиль с активными запросами работодателей.</p>
              <a href="#vacancies" className="btn-primary mt-5 inline-flex">
                Открыть подборку
              </a>
            </section>
          )}

          <section id="offers">
            <h2 className="mb-3 font-display text-lg font-bold">Предложения</h2>
            {offers.length === 0 ? (
              <EmptyState
                title="Пока нет предложений"
                description="Когда работодатель найдёт ваш профиль и отправит предложение, оно появится здесь."
                action={
                  <Link href="/candidate/profile" className="btn-primary">
                    Усилить профиль
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {offers.map((o) => (
                  <article key={o.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">{o.company?.name}</h3>
                      <p className="text-sm text-ink-600">{o.vacancy?.title}</p>
                      <p className="mt-1 text-sm">
                        {o.salary ? `${new Intl.NumberFormat('ru-RU').format(o.salary)} ₽` : formatSalary(o.vacancy?.salaryFrom, o.vacancy?.salaryTo)}
                        {' · '}
                        {FORMAT_LABEL[o.workFormat || o.vacancy?.workFormat] || ''}
                      </p>
                      <p className="mt-1 text-xs font-medium text-ink-500">{OFFER_STATUS_LABEL[o.status]}</p>
                      {o.message && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{o.message}</p>}
                      {o.status === 'ACCEPTED' && o.employer?.email ? (
                        <p className="mt-2 text-sm text-ink-800">
                          Контакт работодателя:{' '}
                          <a className="font-semibold text-brand-800" href={`mailto:${o.employer.email}`}>
                            {o.employer.email}
                          </a>
                        </p>
                      ) : null}
                    </div>
                    {o.status === 'PENDING' && (
                      <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:flex">
                        <button
                          type="button"
                          className="btn-primary min-h-11"
                          onClick={() =>
                            setConfirm({
                              id: o.id,
                              status: 'ACCEPTED',
                              title: o.vacancy?.title || '',
                              company: o.company?.name || 'компанией',
                            })
                          }
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          className="btn-secondary min-h-11"
                          onClick={() =>
                            setConfirm({
                              id: o.id,
                              status: 'REJECTED',
                              title: o.vacancy?.title || '',
                              company: o.company?.name || '',
                            })
                          }
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section id="vacancies">
            <h2 className="mb-3 font-display text-lg font-bold">Подходящие вакансии</h2>
            {vacancies.length === 0 ? (
              <EmptyState
                title="Пока нет подходящих вакансий"
                description="Дополните навыки и опыт — подборка обновится автоматически."
                action={
                  <Link href="/candidate/profile" className="btn-primary">
                    Дополнить профиль
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3">
                {vacancies.map((v) => (
                  <article key={v.id} className="card space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{v.title}</h3>
                        <p className="text-sm text-ink-600">
                          {v.company?.name || v.companyName} · {roleDisplay(v.roleTitle)}
                        </p>
                      </div>
                      <MatchBadge score={v.blendedScore ?? v.matchScore} />
                    </div>
                    <SkillChips
                      skills={(v.skills || [])
                        .map((s: any) => (typeof s === 'string' ? s : s.skill?.name || s.name))
                        .filter(Boolean)
                        .slice(0, 6)}
                    />
                    <p className="text-sm text-ink-600">
                      {formatSalary(v.salaryFrom, v.salaryTo)} · {FORMAT_LABEL[v.workFormat]}
                    </p>
                    {openWhy === v.id ? (
                      <MatchExplain
                        score={v.blendedScore ?? v.matchScore}
                        breakdown={v.matchBreakdown}
                        reasons={v.reasons}
                        compact
                      />
                    ) : (
                      v.reasons?.length > 0 && (
                        <ul className="space-y-1 text-sm text-ink-600">
                          {v.reasons.slice(0, 3).map((r: string) => (
                            <li key={r}>✓ {r}</li>
                          ))}
                        </ul>
                      )
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setOpenWhy(openWhy === v.id ? null : v.id)}>
                        {openWhy === v.id ? 'Скрыть' : 'Почему вам подходит'}
                      </button>
                      <Link href={`/vacancies/${v.id}`} className="btn-primary">
                        Подробнее
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.status === 'ACCEPTED' ? 'Принять предложение?' : 'Отклонить предложение?'}
        message={
          confirm?.status === 'ACCEPTED'
            ? `Вы подтверждаете интерес к вакансии «${confirm?.title}» в компании ${confirm?.company}.`
            : `Предложение по вакансии «${confirm?.title}» будет отклонено.`
        }
        confirmLabel={confirm?.status === 'ACCEPTED' ? 'Принять' : 'Отклонить'}
        danger={confirm?.status === 'REJECTED'}
        loading={confirmLoading}
        onConfirm={respond}
        onClose={() => setConfirm(null)}
      />
    </AppShell>
  );
}
