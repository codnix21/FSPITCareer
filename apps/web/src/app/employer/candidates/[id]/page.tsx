'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import {
  AppShell,
  ErrorBox,
  ExpandableSkillChips,
  FspAchievements,
  InitialsAvatar,
  MatchBadge,
  MatchExplain,
  Modal,
  ProgressBar,
  Spinner,
} from '@/components/ui';
import { api } from '@/lib/api';
import { experienceLabel, FORMAT_LABEL, formatSalary, GRADE_LABEL, roleDisplay } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

function CandidateView() {
  const params = useParams();
  const search = useSearchParams();
  const id = params.id as string;
  const vacancyIdParam = search.get('vacancyId');

  const [profile, setProfile] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [pair, setPair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ vacancyId: '', salary: 220000, workFormat: 'REMOTE', message: '' });
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [acceptedHint, setAcceptedHint] = useState(false);
  const [contact, setContact] = useState<{ email: string; phone: string | null } | null>(null);
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let vacancyId = vacancyIdParam;
        if (!vacancyId) {
          try {
            const nav = sessionStorage.getItem(`fsp_nav_${id}`);
            if (nav) vacancyId = JSON.parse(nav).vacancyId || null;
          } catch {
            /* ignore */
          }
        }

        const [p, v] = await Promise.all([api(`/candidates/${id}`), api('/vacancies/employer/mine')]);
        setProfile(p);
        const companyVacancies = (v.items || []).filter((x: any) => x.status === 'ACTIVE');
        setVacancies(companyVacancies);
        const preferred = companyVacancies.find((x: any) => x.id === vacancyId) || companyVacancies[0];
        setOfferForm((f) => ({
          ...f,
          vacancyId: preferred?.id || '',
          salary: preferred?.salaryFrom || 220000,
          workFormat: preferred?.workFormat || 'REMOTE',
          message: `Здравствуйте!\nМы заинтересованы в вашем профессиональном профиле и хотели бы предложить вам рассмотреть вакансию «${preferred?.title || 'в нашей компании'}».`,
        }));

        // Authoritative match only from backend
        if (vacancyId) {
          try {
            const detail = await api(`/matching/pair?candidateId=${id}&vacancyId=${vacancyId}`);
            setPair(detail);
          } catch {
            setPair(null);
          }
        } else {
          setPair(null);
        }

        try {
          const c = await api(`/candidates/${id}/contact`);
          setContact({ email: c.email, phone: c.phone ?? null });
          setContactMsg('');
        } catch {
          setContact(null);
          setContactMsg('Контактные данные откроются после принятия предложения.');
        }
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
      setToast('');
      setAcceptedHint(true);
    } catch (err: any) {
      setToast(err.message || 'Не удалось отправить предложение');
    } finally {
      setSending(false);
    }
  }

  const selectedVacancy = vacancies.find((v) => v.id === offerForm.vacancyId);
  const score = pair ? (pair.blendedScore ?? pair.matchScore ?? 0) : 0;

  return (
    <AppShell title="Профиль специалиста" nav={employerNav}>
      {loading && <Spinner label="Загрузка профиля" />}
      {error && <ErrorBox message={error} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {profile && (
        <div className="space-y-5 pb-24 lg:pb-0">
          <Link href="/employer/search" className="inline-flex text-sm font-medium text-ink-500 hover:text-ink-900">
            ← Назад к специалистам
          </Link>

          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                <InitialsAvatar firstName={profile.user.firstName} lastName={profile.user.lastName} size="lg" />
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950 md:text-3xl">
                    {profile.user.firstName} {profile.user.lastName}
                  </h2>
                  <p className="mt-1 text-base text-ink-700">
                    {profile.candidateCategory?.name ||
                      (profile.specialization?.name
                        ? `${profile.specialization.name} · ${GRADE_LABEL[profile.grade] || profile.grade}`
                        : `${roleDisplay(profile.roleTitle)} · ${GRADE_LABEL[profile.grade]}`)}
                  </p>
                  <p className="meta-row mt-3">
                    {profile.industry?.name ? <span>Отрасль: {profile.industry.name}</span> : null}
                    {profile.specialization?.name ? <span>Специализация: {profile.specialization.name}</span> : null}
                    <span>{experienceLabel(profile.experienceYears)}</span>
                    {profile.city ? <span>{profile.city}</span> : null}
                    <span>{FORMAT_LABEL[profile.workFormat]}</span>
                    <span>{formatSalary(profile.salaryFrom, profile.salaryTo)}</span>
                  </p>
                  {score > 0 && (
                    <div className="mt-4 lg:hidden">
                      <MatchBadge score={score} size="lg" />
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden flex-col items-end gap-3 lg:flex">
                {score > 0 && <MatchBadge score={score} size="lg" />}
                <button
                  type="button"
                  className="btn-primary !px-6"
                  onClick={() => setModal(true)}
                  disabled={!vacancies.length}
                >
                  Предложить вакансию
                </button>
              </div>
            </div>
            {!vacancies.length && (
              <p className="mt-3 text-sm text-ink-500">
                Чтобы отправить предложение,{' '}
                <Link href="/employer/vacancies" className="font-semibold text-brand-700">
                  создайте активную вакансию
                </Link>
                .
              </p>
            )}
            {profile.about && <p className="mt-5 text-sm leading-relaxed text-ink-600">{profile.about}</p>}
            <div className="mt-5 rounded-lg border border-ink-950/8 bg-ink-50/50 px-4 py-3 text-sm">
              <p className="font-medium text-ink-900">Контактные данные</p>
              {contact ? (
                <div className="mt-2 space-y-1 text-ink-700">
                  <p>
                    Email:{' '}
                    <a className="font-semibold text-brand-800" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
                  </p>
                  {contact.phone ? <p>Телефон: {contact.phone}</p> : null}
                </div>
              ) : (
                <p className="mt-1 text-ink-600">{contactMsg || 'Контактные данные откроются после принятия предложения.'}</p>
              )}
            </div>
          </section>

          {(pair || score > 0) && (
            <MatchExplain
              score={score || pair?.matchScore || 0}
              breakdown={pair?.breakdown || pair?.matchBreakdown}
              reasons={pair?.reasons}
            />
          )}

          <section className="card">
            <h3 className="section-title">Ключевые навыки</h3>
            <div className="mt-3">
              <ExpandableSkillChips
                skills={(profile.skills || []).map((s: any) => ({ name: s.skill.name, level: s.level }))}
                limit={6}
              />
            </div>
          </section>

          <section className="card">
            <h3 className="section-title">Опыт работы</h3>
            {profile.experiences?.length ? (
              <ul className="mt-4 space-y-0">
                {profile.experiences.map((exp: any) => (
                  <li key={exp.id} className="relative border-l border-ink-200 pb-6 pl-5 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                    <p className="font-medium text-ink-950">{exp.position}</p>
                    <p className="text-sm text-ink-600">{exp.company}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {exp.startDate ? new Date(exp.startDate).getFullYear() : '—'}
                      {' — '}
                      {exp.endDate ? new Date(exp.endDate).getFullYear() : 'настоящее время'}
                    </p>
                    {exp.description && <p className="mt-2 text-sm text-ink-600">{exp.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Опыт не указан</p>
            )}
          </section>

          <FspAchievements achievements={profile.achievements || []} />

          <section className="card" id="resume">
            <h3 className="section-title">Резюме</h3>
            {profile.resumes?.length ? (
              <div className="mt-3 space-y-2 text-sm">
                {profile.resumes.map((r: any) => (
                  <div key={r.id} className="rounded-[10px] bg-ink-50 px-4 py-3">
                    <p className="font-medium">{r.originalName || 'Файл резюме'}</p>
                    <p className="text-ink-500">Загружено{r.analysis ? ' · проанализировано' : ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Файл резюме не загружен</p>
            )}
          </section>

          <section className="card">
            <h3 className="section-title">Техническое тестирование</h3>
            {profile.assessment?.latest ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink-800">
                  Assessment: {profile.assessment.status === 'PASSED' ? 'Пройден' : 'Не пройден'}
                </p>
                <p className="text-sm text-ink-700">
                  Score: {profile.assessment.latest.score}/100
                </p>
                <p className="text-sm text-ink-700">
                  Рекомендуемый уровень:{' '}
                  {GRADE_LABEL[profile.assessment.latest.recommendedGrade] || profile.assessment.latest.recommendedGrade}
                </p>
                {profile.candidateCategory?.name && (
                  <p className="text-sm text-ink-700">Категория специалиста: {profile.candidateCategory.name}</p>
                )}
                <ProgressBar value={profile.assessment.latest.score} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Результатов тестирования пока нет</p>
            )}
          </section>

          <section className="card">
            <h3 className="section-title">Технические задания</h3>
            {profile.challenges?.totalSubmitted ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink-800">
                  Пройдено {profile.challenges.passedCount ?? 0} из {profile.challenges.totalSubmitted}
                </p>
                <ul className="space-y-2 text-sm text-ink-700">
                  {(profile.challenges.recent || []).map((r: any, idx: number) => (
                    <li key={`${r.title}-${idx}`} className="rounded-[10px] bg-ink-50 px-4 py-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-ink-500">
                        {[r.specialization?.name, r.skill?.name, r.difficulty]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1">
                        {r.score}/100 · {r.passed ? 'Пройдено' : 'Не пройдено'}
                        {r.submittedAt
                          ? ` · ${new Date(r.submittedAt).toLocaleDateString('ru-RU')}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Результатов заданий пока нет</p>
            )}
          </section>

          {acceptedHint && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950">
              <h3 className="font-display text-xl font-bold">Предложение отправлено</h3>
              <p className="mt-2 text-sm">Кандидат увидит предложение в своём кабинете.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/employer/offers" className="btn-primary">
                  Посмотреть предложения
                </Link>
                <Link href="/employer/search" className="btn-secondary">
                  Вернуться к специалистам
                </Link>
              </div>
            </div>
          )}

          {/* Mobile CTA над нижней навигацией */}
          <div className="fixed inset-x-0 bottom-[4.5rem] z-30 border-t border-ink-950/8 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setModal(true)}
              disabled={!vacancies.length}
            >
              Предложить вакансию
            </button>
          </div>
        </div>
      )}

      <Modal open={modal} title="Предложить вакансию" onClose={() => setModal(false)}>
        <form onSubmit={sendOffer} className="space-y-3">
          <div>
            <label className="label" htmlFor="offer-vacancy">
              Вакансия
            </label>
            <select
              id="offer-vacancy"
              className="field"
              value={offerForm.vacancyId}
              onChange={(e) => setOfferForm({ ...offerForm, vacancyId: e.target.value })}
              required
            >
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
            <label className="label" htmlFor="offer-salary">
              Зарплата, ₽
            </label>
            <input
              id="offer-salary"
              className="field"
              type="number"
              value={offerForm.salary}
              onChange={(e) => setOfferForm({ ...offerForm, salary: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="offer-format">
              Формат
            </label>
            <select
              id="offer-format"
              className="field"
              value={offerForm.workFormat}
              onChange={(e) => setOfferForm({ ...offerForm, workFormat: e.target.value })}
            >
              {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="offer-msg">
              Сообщение
            </label>
            <textarea
              id="offer-msg"
              className="field min-h-28"
              value={offerForm.message}
              onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
            />
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
