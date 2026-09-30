'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, EmptyState, ErrorBox, MatchBadge, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import {
  experienceLabel,
  FORMAT_LABEL,
  formatSalaryShort,
  GRADE_LABEL,
  ROLE_OPTIONS,
  TECH_OPTIONS,
} from '@/lib/labels';
import { employerNav } from '@/lib/nav';

const nav = employerNav;

function SearchInner() {
  const searchParams = useSearchParams();
  const vacancyIdParam = searchParams.get('vacancyId');

  const [form, setForm] = useState({
    roleTitle: 'Backend Developer',
    grade: 'MIDDLE',
    technologies: ['Python', 'FastAPI', 'PostgreSQL'] as string[],
    experienceFrom: 2,
    experienceTo: 5,
    salaryFrom: 180000,
    salaryTo: 260000,
    workFormat: 'REMOTE',
    sortBy: 'match',
    hasFspAchievements: false,
    vacancyId: '',
  });
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bootstrapping, setBootstrapping] = useState(!!vacancyIdParam);

  const techSet = useMemo(() => new Set(form.technologies), [form.technologies]);

  function toggleTech(name: string) {
    setForm((f) => ({
      ...f,
      technologies: techSet.has(name) ? f.technologies.filter((t) => t !== name) : [...f.technologies, name],
    }));
  }

  async function runSearch(payload = form) {
    setLoading(true);
    setError('');
    try {
      const res = await api('/matching/search', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          vacancyId: payload.vacancyId || undefined,
        }),
      });
      setResults(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить поиск');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!vacancyIdParam) {
      setBootstrapping(false);
      runSearch(form);
      return;
    }
    (async () => {
      try {
        const v = await api(`/vacancies/${vacancyIdParam}`);
        const next = {
          roleTitle: v.roleTitle as string,
          grade: v.grade as string,
          technologies: (v.skills || []).map((s: any) => s.skill.name) as string[],
          experienceFrom: Number(v.experienceFrom ?? 0),
          experienceTo: Number(v.experienceTo ?? 10),
          salaryFrom: Number(v.salaryFrom ?? 0),
          salaryTo: Number(v.salaryTo ?? 500000),
          workFormat: v.workFormat as string,
          sortBy: 'match',
          hasFspAchievements: false,
          vacancyId: v.id as string,
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

  async function onSearch(e?: FormEvent) {
    e?.preventDefault();
    setFiltersOpen(false);
    await runSearch();
  }

  return (
    <AppShell
      title="Поиск"
      nav={nav}
      actions={
        <button type="button" className="btn-primary !px-3 !py-2 lg:hidden" onClick={() => onSearch()} disabled={loading}>
          Найти
        </button>
      }
    >
      {vacancyTitle && (
        <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Поиск по вакансии: <strong>{vacancyTitle}</strong>
        </p>
      )}
      {bootstrapping && <Spinner label="Загрузка требований вакансии" />}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <form onSubmit={onSearch} className="card h-fit space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold">Требования</h2>
            <button type="button" className="text-sm font-semibold text-brand-700 lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>
              {filtersOpen ? 'Скрыть' : 'Изменить'}
            </button>
          </div>

          <div className={`space-y-3 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div>
              <label className="label">Роль</label>
              <select className="field" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Грейд</label>
              <select className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                {Object.entries(GRADE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Технологии</label>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-ink-950/10 p-2">
                {TECH_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTech(t)}
                    className={`badge ${techSet.has(t) ? 'bg-brand-100 text-brand-800' : 'bg-ink-50 text-ink-600'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Зарплата от</label>
                <input className="field" type="number" value={form.salaryFrom} onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">до</label>
                <input className="field" type="number" value={form.salaryTo} onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <label className="label">Формат</label>
              <select className="field" value={form.workFormat} onChange={(e) => setForm({ ...form, workFormat: e.target.value })}>
                {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Сортировка</label>
              <select className="field" value={form.sortBy} onChange={(e) => setForm({ ...form, sortBy: e.target.value })}>
                <option value="match">По соответствию</option>
                <option value="experience">По опыту</option>
                <option value="achievements">По достижениям</option>
                <option value="salary">По зарплате</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.hasFspAchievements} onChange={(e) => setForm({ ...form, hasFspAchievements: e.target.checked })} />
              Есть достижения ФСП
            </label>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Поиск…' : 'Найти специалистов'}
          </button>
        </form>

        <div>
          {loading && !bootstrapping && <Spinner label="Подбираем специалистов" />}
          {error && <ErrorBox message={error} onRetry={() => onSearch()} />}

          {!loading && results && (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-700">Найдено: {results.length}</p>
              </div>
              {results.length === 0 ? (
                <EmptyState title="Никого не нашли" description="Ослабьте фильтры или уберите часть технологий." />
              ) : (
                <div className="grid gap-3">
                  {results.map((m) => (
                    <article key={m.id} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {m.firstName} {m.lastName}
                          </h3>
                          <p className="text-sm text-ink-600">
                            {m.roleTitle} · {GRADE_LABEL[m.grade]}
                          </p>
                        </div>
                        <MatchBadge score={m.matchScore} />
                      </div>
                      <div className="mt-3">
                        <SkillChips skills={m.skills.map((s: any) => s.name)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink-600">
                        <span>{experienceLabel(m.experienceYears)}</span>
                        <span>{formatSalaryShort(m.salaryFrom, m.salaryTo)}</span>
                        <span>{FORMAT_LABEL[m.workFormat]}</span>
                      </div>
                      {m.achievementsCount > 0 && (
                        <p className="mt-2 text-sm font-medium text-ink-700">Достижений ФСП: {m.achievementsCount}</p>
                      )}
                      {m.reasons?.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm text-ink-600">
                          {m.reasons.slice(0, 3).map((r: string) => (
                            <li key={r}>✓ {r}</li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/employer/candidates/${m.id}?score=${Math.round(m.matchScore)}${form.vacancyId ? `&vacancyId=${form.vacancyId}` : ''}`}
                        className="btn-primary mt-4 w-full sm:w-auto"
                      >
                        Открыть и предложить
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
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
