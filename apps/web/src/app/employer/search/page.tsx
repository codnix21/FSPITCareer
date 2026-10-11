'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, EmptyState, ErrorBox, MatchBadge, MatchExplain, SkillChips, Spinner } from '@/components/ui';
import { SearchableMultiSelect, type SelectOption } from '@/components/searchable-select';
import { api } from '@/lib/api';
import {
  experienceLabel,
  FORMAT_LABEL,
  formatSalaryShort,
  GRADE_LABEL,
  roleDisplay,
} from '@/lib/labels';
import { employerNav } from '@/lib/nav';
import { optionFromValue, searchReferenceSkills } from '@/lib/reference';

type FormState = {
  roleTitle: string;
  specializationId: string;
  grade: string;
  technologies: string[];
  experienceFrom: number;
  salaryFrom: number;
  salaryTo: number;
  workFormat: string;
  vacancyId: string;
};

const STEPS = ['Кого ищете?', 'Уровень', 'Навыки', 'Условия'];

function SearchInner() {
  const searchParams = useSearchParams();
  const vacancyIdParam = searchParams.get('vacancyId');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    roleTitle: 'Backend Developer',
    specializationId: '',
    grade: 'MIDDLE',
    technologies: ['Python', 'FastAPI', 'PostgreSQL'],
    experienceFrom: 2,
    salaryFrom: 200000,
    salaryTo: 250000,
    workFormat: 'REMOTE',
    vacancyId: '',
  });
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bootstrapping, setBootstrapping] = useState(!!vacancyIdParam);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ind = await api('/reference/industries', { auth: false });
        const it = (ind.items || []).find((i: any) => i.slug === 'it') || ind.items?.[0];
        if (!it) return;
        const specs = await api(`/reference/specializations?industryId=${it.id}`, { auth: false });
        setSpecializations(specs.items || []);
        const backend = (specs.items || []).find((s: any) => s.slug === 'backend-development');
        if (backend) {
          setForm((f) => ({ ...f, specializationId: f.specializationId || backend.id, roleTitle: backend.name }));
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const techOptions: SelectOption[] = form.technologies.map((t) => optionFromValue(t));

  function setTechnologies(next: SelectOption[]) {
    setForm((f) => ({ ...f, technologies: next.map((o) => o.value) }));
  }

  async function runSearch(payload = form) {
    setLoading(true);
    setError('');
    try {
      const res = await api('/matching/search', {
        method: 'POST',
        body: JSON.stringify({
          roleTitle: payload.roleTitle,
          specializationId: payload.specializationId || undefined,
          grade: payload.grade,
          technologies: payload.technologies,
          experienceFrom: payload.experienceFrom,
          salaryFrom: payload.salaryFrom,
          salaryTo: payload.salaryTo,
          workFormat: payload.workFormat,
          sortBy: 'match',
          vacancyId: payload.vacancyId || undefined,
        }),
      });
      setResults(res.items || []);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить поиск');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!vacancyIdParam) {
      setBootstrapping(false);
      return;
    }
    (async () => {
      try {
        const v = await api(`/vacancies/${vacancyIdParam}`);
        const next: FormState = {
          roleTitle: v.roleTitle,
          specializationId: v.specializationId || '',
          grade: v.grade,
          technologies: (v.skills || []).map((s: any) => s.skill.name),
          experienceFrom: Number(v.experienceFrom ?? 0),
          salaryFrom: Number(v.salaryFrom ?? 200000),
          salaryTo: Number(v.salaryTo ?? 250000),
          workFormat: v.workFormat,
          vacancyId: v.id,
        };
        setVacancyTitle(v.title);
        setForm(next);
        await runSearch(next);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить вакансию');
      } finally {
        setBootstrapping(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyIdParam]);

  const canNext =
    (step === 0 && !!form.specializationId) ||
    (step === 1 && !!form.grade) ||
    (step === 2 && form.technologies.length > 0) ||
    step === 3;

  return (
    <AppShell title="Найти специалиста" nav={employerNav}>
      {vacancyTitle && (
        <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Поиск по вакансии: <strong>{vacancyTitle}</strong>
        </p>
      )}
      {bootstrapping && <Spinner label="Загрузка требований вакансии" />}
      {error && <ErrorBox message={error} onRetry={() => runSearch()} />}

      {!bootstrapping && results === null && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Найдите подходящего специалиста</h2>
            <p className="mt-2 text-ink-600">Укажите основные требования — мы подберём специалистов из базы.</p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Шаги поиска">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={step === i}
                onClick={() => setStep(i)}
                className={`rounded-[10px] px-3 py-2 text-sm font-medium ${step === i ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-white text-ink-600 ring-1 ring-ink-950/8'}`}
              >
                <span className="mr-1.5 text-xs text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {specializations.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm({ ...form, specializationId: s.id, roleTitle: s.name })}
                  className={`card !p-4 text-left transition ${form.specializationId === s.id ? 'ring-2 ring-brand-600' : 'hover:border-brand-300'}`}
                >
                  <span className="font-display text-base font-bold">{s.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(GRADE_LABEL).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, grade: k })}
                  className={`card !p-5 text-center transition ${form.grade === k ? 'ring-2 ring-brand-600' : 'hover:border-brand-300'}`}
                >
                  <span className="font-display text-lg font-bold">{v}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="card space-y-2">
              <SearchableMultiSelect
                label="Навыки"
                placeholder="Начните вводить навык..."
                searchPlaceholder="Начните вводить навык..."
                idleHint="Начните вводить название навыка"
                value={techOptions}
                onChange={setTechnologies}
                onSearch={searchReferenceSkills}
              />
              <p className="text-xs text-ink-500">Подсказки из внешнего справочника HeadHunter.</p>
            </div>
          )}

          {step === 3 && (
            <div className="card grid max-w-xl gap-4">
              <div>
                <label className="label" htmlFor="exp">
                  Опыт от (лет)
                </label>
                <input
                  id="exp"
                  className="field"
                  type="number"
                  min={0}
                  value={form.experienceFrom}
                  onChange={(e) => setForm({ ...form, experienceFrom: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="sal-from">
                    Зарплата от, ₽
                  </label>
                  <input
                    id="sal-from"
                    className="field"
                    type="number"
                    value={form.salaryFrom}
                    onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="sal-to">
                    до, ₽
                  </label>
                  <input
                    id="sal-to"
                    className="field"
                    type="number"
                    value={form.salaryTo}
                    onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })}
                  />
                </div>
              </div>
              <fieldset>
                <legend className="label">Формат</legend>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                    <label key={k} className={`card !p-3 text-center text-sm font-semibold ${form.workFormat === k ? 'ring-2 ring-brand-600' : ''}`}>
                      <input
                        type="radio"
                        className="sr-only"
                        name="format"
                        checked={form.workFormat === k}
                        onChange={() => setForm({ ...form, workFormat: k })}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Назад
            </button>
            {step < 3 ? (
              <button type="button" className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Далее
              </button>
            ) : (
              <div className="text-right">
                <button type="button" className="btn-primary !px-8 !py-3 text-base" disabled={loading || form.technologies.length === 0} onClick={() => runSearch()}>
                  {loading ? 'Ищем…' : 'Найти специалистов'}
                </button>
                <p className="mt-2 max-w-sm text-xs text-ink-500">
                  Поиск учитывает роль, технологии, опыт, уровень, зарплату, формат работы и достижения ФСП.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!bootstrapping && results && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Подходящие специалисты</h2>
              <p className="mt-1 text-sm text-ink-600">
                {results.length} {results.length === 1 ? 'специалист соответствует' : results.length < 5 ? 'специалиста соответствуют' : 'специалистов соответствуют'} вашим требованиям
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setResults(null);
                setStep(0);
              }}
            >
              Изменить запрос
            </button>
          </div>

          <div className="rounded-xl border border-ink-950/10 bg-white px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold">По вашему запросу</p>
            <p className="mt-1">
              {roleDisplay(form.roleTitle)} · {GRADE_LABEL[form.grade]} · {form.technologies.slice(0, 5).join(' · ')} ·{' '}
              {FORMAT_LABEL[form.workFormat]} · {formatSalaryShort(form.salaryFrom, form.salaryTo)}
            </p>
          </div>

          {loading && <Spinner label="Подбираем специалистов" />}

          {!loading && results.length === 0 && (
            <EmptyState
              title="Никого не нашли"
              description="Ослабьте требования: уберите часть технологий или расширьте диапазон зарплаты."
              action={
                <button type="button" className="btn-primary" onClick={() => { setResults(null); setStep(2); }}>
                  Изменить технологии
                </button>
              }
            />
          )}

          {!loading &&
            results.map((m) => {
              return (
              <article key={m.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-bold tracking-tight text-ink-950">
                      {m.firstName} {m.lastName}
                    </h3>
                    <p className="mt-1 text-sm text-ink-700">
                      {roleDisplay(m.roleTitle)}
                      <span className="text-ink-400"> · </span>
                      {GRADE_LABEL[m.grade]}
                    </p>
                    <p className="meta-row mt-3">
                      <span>{experienceLabel(m.experienceYears)}</span>
                      <span>{FORMAT_LABEL[m.workFormat]}</span>
                      <span>{formatSalaryShort(m.salaryFrom, m.salaryTo)}</span>
                    </p>
                    <div className="mt-3">
                      <SkillChips skills={(m.skills || []).map((s: any) => s.name).slice(0, 5)} />
                    </div>
                    {m.achievementsCount > 0 && (
                      <p className="mt-3 text-sm font-medium text-brand-800">Есть достижения ФСП</p>
                    )}
                  </div>
                  <MatchBadge score={m.matchScore} size="lg" />
                </div>

                {expandedId === m.id && (
                  <div className="mt-4">
                    <MatchExplain score={m.matchScore} breakdown={m.matchBreakdown} reasons={m.reasons} compact />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-950/5 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                    {expandedId === m.id ? 'Скрыть' : 'Почему подходит'}
                  </button>
                  <Link
                    href={`/employer/candidates/${m.id}${form.vacancyId ? `?vacancyId=${form.vacancyId}` : ''}`}
                    className="btn-primary"
                    onClick={() => {
                      try {
                        // Navigation context only — never authoritative score
                        sessionStorage.setItem(
                          `fsp_nav_${m.id}`,
                          JSON.stringify({
                            vacancyId: form.vacancyId || null,
                          }),
                        );
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    Посмотреть профиль
                  </Link>
                </div>
              </article>
            );
            })}
        </div>
      )}
    </AppShell>
  );
}

export default function EmployerSearchPage() {
  return (
    <Suspense fallback={<Spinner label="Загрузка поиска" />}>
      <SearchInner />
    </Suspense>
  );
}
