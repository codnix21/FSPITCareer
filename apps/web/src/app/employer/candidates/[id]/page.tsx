'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { AppShell, ErrorBox, MatchBadge, Modal, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { experienceLabel, FORMAT_LABEL, formatSalary, GRADE_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

const nav = employerNav;

function CandidateView() {
  const params = useParams();
  const search = useSearchParams();
  const id = params.id as string;
  const scoreParam = search.get('score');
  const vacancyIdParam = search.get('vacancyId');

  const [profile, setProfile] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ vacancyId: '', salary: 220000, workFormat: 'REMOTE', message: '' });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [p, v] = await Promise.all([api(`/candidates/${id}`), api('/vacancies/employer/mine')]);
        setProfile(p);
        const companyVacancies = (v.items || []).filter((x: any) => x.status === 'ACTIVE');
        setVacancies(companyVacancies);
        const preferred = companyVacancies.find((x: any) => x.id === vacancyIdParam) || companyVacancies[0];
        setOfferForm((f) => ({
          ...f,
          vacancyId: preferred?.id || '',
          salary: preferred?.salaryFrom || 220000,
          workFormat: preferred?.workFormat || 'REMOTE',
          message: `Здравствуйте!\nМы заинтересованы в вашем профессиональном профиле и хотели бы предложить вам рассмотреть вакансию ${preferred?.title || 'в нашей компании'}.`,
        }));
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, vacancyIdParam]);

  async function sendOffer(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSending(true);
    setToast('');
    try {
      await api('/offers', {
        method: 'POST',
        body: JSON.stringify({
          vacancyId: offerForm.vacancyId,
          candidateUserId: profile.userId,
          salary: offerForm.salary,
          workFormat: offerForm.workFormat,
          message: offerForm.message,
        }),
      });
      setModal(false);
      setToast('Предложение отправлено');
    } catch (err: any) {
      setToast(err.message || 'Не удалось отправить предложение. Проверьте соединение и попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  }

  const selectedVacancy = vacancies.find((v) => v.id === offerForm.vacancyId);

  return (
    <AppShell title="Профиль специалиста" nav={nav}>
      {loading && <Spinner label="Загрузка профиля" />}
      {error && <ErrorBox message={error} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {profile && (
        <div className="space-y-5">
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {profile.user.firstName} {profile.user.lastName}
                </h2>
                <p className="mt-1 text-ink-600">{profile.roleTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink-600">
                  <span className="badge bg-ink-50">{GRADE_LABEL[profile.grade]}</span>
                  <span className="badge bg-ink-50">{experienceLabel(profile.experienceYears)}</span>
                  <span className="badge bg-ink-50">{FORMAT_LABEL[profile.workFormat]}</span>
                  <span className="badge bg-ink-50">{formatSalary(profile.salaryFrom, profile.salaryTo)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.isVerified && <span className="badge bg-brand-50 text-brand-800">✓ Профиль подтверждён</span>}
                  {scoreParam && <MatchBadge score={Number(scoreParam)} />}
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={() => setModal(true)}>
                Предложить вакансию
              </button>
            </div>
            {profile.about && <p className="mt-4 text-sm leading-relaxed text-ink-600">{profile.about}</p>}
          </section>

          <section className="card">
            <h3 className="font-semibold">Навыки</h3>
            <div className="mt-3">
              <SkillChips skills={profile.skills.map((s: any) => `${s.skill.name} · ${s.level}/5`)} />
            </div>
          </section>

          <section className="card">
            <h3 className="font-semibold">Опыт работы</h3>
            {profile.experiences?.length ? (
              <ul className="mt-3 space-y-3">
                {profile.experiences.map((exp: any) => (
                  <li key={exp.id} className="rounded-xl bg-ink-50 p-3">
                    <p className="font-medium">
                      {exp.position} · {exp.company}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">{exp.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Опыт не указан</p>
            )}
          </section>

          <section className="card">
            <h3 className="font-semibold">Образование</h3>
            {profile.educations?.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {profile.educations.map((ed: any) => (
                  <li key={ed.id}>
                    {ed.institution} — {ed.degree}, {ed.field} ({ed.yearFrom}–{ed.yearTo})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Образование не указано</p>
            )}
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Достижения ФСП</h3>
              <span className="badge bg-amber-50 text-amber-800">Подтверждено ФСП</span>
              <span className="badge bg-ink-100 text-ink-600">Демонстрационные данные</span>
            </div>
            {profile.achievements?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {profile.achievements.map((a: any) => (
                  <article key={a.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="font-semibold">🏆 {a.title}</p>
                    <dl className="mt-3 space-y-1 text-sm text-ink-700">
                      <div>
                        <dt className="inline font-medium">Дисциплина: </dt>
                        <dd className="inline">{a.discipline}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Результат: </dt>
                        <dd className="inline">{a.place} место</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Год: </dt>
                        <dd className="inline">{a.year}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Статус: </dt>
                        <dd className="inline">{a.status}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Нет достижений</p>
            )}
          </section>

          <section className="card">
            <h3 className="font-semibold">Результаты тестирования</h3>
            {profile.testAttempts?.length ? (
              <ul className="mt-3 space-y-2">
                {profile.testAttempts.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-sm">
                    <span>{t.test?.title || 'Тест'}</span>
                    <span className="font-semibold">
                      {t.score}/{t.maxScore}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Результатов тестирования пока нет</p>
            )}
          </section>

          <Link href="/employer/search" className="btn-secondary">
            Назад к поиску
          </Link>
        </div>
      )}

      <Modal open={modal} title="Предложение специалисту" onClose={() => setModal(false)}>
        <form onSubmit={sendOffer} className="space-y-3">
          <div>
            <label className="label">Вакансия</label>
            <select className="field" value={offerForm.vacancyId} onChange={(e) => setOfferForm({ ...offerForm, vacancyId: e.target.value })} required>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-ink-600">
            Компания: <strong>{selectedVacancy?.company?.name || '—'}</strong>
          </p>
          <div>
            <label className="label">Зарплата</label>
            <input className="field" type="number" value={offerForm.salary} onChange={(e) => setOfferForm({ ...offerForm, salary: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Формат</label>
            <select className="field" value={offerForm.workFormat} onChange={(e) => setOfferForm({ ...offerForm, workFormat: e.target.value })}>
              {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Сообщение</label>
            <textarea className="field min-h-28" value={offerForm.message} onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={sending || !offerForm.vacancyId}>
            {sending ? 'Отправка…' : 'Отправить предложение'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}

export default function EmployerCandidatePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CandidateView />
    </Suspense>
  );
}
