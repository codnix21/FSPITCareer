'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorBox, SiteHeader, SkillChips, SkeletonCards } from '@/components/ui';
import { SearchableSelect } from '@/components/searchable-select';
import { api } from '@/lib/api';
import { dashboardPath, getStoredUser, type AuthUser } from '@/lib/auth';
import { experienceLabel, FORMAT_LABEL, formatSalaryShort, GRADE_LABEL, ROLE_OPTIONS } from '@/lib/labels';
import { optionFromValue, searchReferenceSkills } from '@/lib/reference';

export default function SpecialistsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    roleTitle: '',
    grade: '',
    workFormat: '',
    skill: '',
    hasFsp: '',
    experienceFrom: '',
  });

  async function load(next = filters) {
    const u = getStoredUser();
    if (!u || (u.role !== 'EMPLOYER' && u.role !== 'ADMIN')) {
      setItems([]);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const res = await api(`/candidates?${qs.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить специалистов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canBrowse = user?.role === 'EMPLOYER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Специалисты</h1>
        <p className="mt-2 text-ink-600">IT-профили с подтверждёнными достижениями ФСП.</p>
        {!canBrowse && (
          <div className="card mt-6">
            <p className="text-sm text-ink-600">Каталог специалистов доступен работодателям после входа.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login" className="btn-primary">
                Войти
              </Link>
              <Link href="/register?role=EMPLOYER" className="btn-secondary">
                Регистрация работодателя
              </Link>
            </div>
          </div>
        )}

        {canBrowse && <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="card h-fit space-y-3">
            <button type="button" className="btn-secondary w-full lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>
              {filtersOpen ? 'Скрыть фильтры' : 'Фильтры'}
            </button>
            <div className={`space-y-3 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
              <div>
                <label className="label">Роль</label>
                <select className="field" value={filters.roleTitle} onChange={(e) => setFilters({ ...filters, roleTitle: e.target.value })}>
                  <option value="">Все</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Грейд</label>
                <select className="field" value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })}>
                  <option value="">Все</option>
                  {Object.entries(GRADE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Формат</label>
                <select className="field" value={filters.workFormat} onChange={(e) => setFilters({ ...filters, workFormat: e.target.value })}>
                  <option value="">Все</option>
                  {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <SearchableSelect
                  label="Технология"
                  placeholder="Все"
                  searchPlaceholder="Поиск навыка..."
                  value={filters.skill ? optionFromValue(filters.skill) : null}
                  onChange={(opt) => setFilters({ ...filters, skill: opt?.value || '' })}
                  onSearch={searchReferenceSkills}
                />
              </div>
              <div>
                <label className="label">Опыт от (лет)</label>
                <input className="field" type="number" value={filters.experienceFrom} onChange={(e) => setFilters({ ...filters, experienceFrom: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.hasFsp === 'true'} onChange={(e) => setFilters({ ...filters, hasFsp: e.target.checked ? 'true' : '' })} />
                Есть достижения ФСП
              </label>
              <button type="button" className="btn-primary w-full" onClick={() => load(filters)}>
                Применить
              </button>
            </div>
          </aside>

          <div>
            {loading && <SkeletonCards count={4} />}
            {error && <ErrorBox message={error} onRetry={() => load()} />}
            {!loading && !error && items.length === 0 && <EmptyState title="Нет кандидатов" description="Измените фильтры или сбросьте условия." />}
            <div className="grid gap-3 md:grid-cols-2">
              {!loading &&
                items.map((c) => (
                  <article key={c.id} className="card">
                    <h2 className="text-lg font-semibold">
                      {c.user.firstName} {c.user.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">
                      {c.roleTitle} · {GRADE_LABEL[c.grade]}
                    </p>
                    <p className="mt-2 text-sm text-ink-500">
                      {experienceLabel(c.experienceYears)} · {FORMAT_LABEL[c.workFormat]} · {formatSalaryShort(c.salaryFrom, c.salaryTo)}
                    </p>
                    <div className="mt-3">
                      <SkillChips skills={(c.skills || []).map((s: any) => s.skill.name).slice(0, 6)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.isVerified && <span className="badge bg-brand-50 text-brand-800">✓ Подтверждённый профиль</span>}
                      {c.achievements?.length > 0 && (
                        <span className="badge bg-brand-50 text-brand-800 ring-1 ring-brand-200">
                          {c.achievements.length} достижения ФСП
                        </span>
                      )}
                    </div>
                    {!user && (
                      <Link href="/login" className="btn-primary mt-4">
                        Войти, чтобы предложить вакансию
                      </Link>
                    )}
                    {user?.role === 'EMPLOYER' && (
                      <Link href="/employer/search" className="btn-primary mt-4">
                        Предложить вакансию
                      </Link>
                    )}
                    {user?.role === 'CANDIDATE' && (
                      <Link href={dashboardPath('CANDIDATE')} className="btn-secondary mt-4">
                        В кабинет
                      </Link>
                    )}
                    {user?.role === 'ADMIN' && (
                      <Link href={`/employer/candidates/${c.id}`} className="btn-primary mt-4">
                        Открыть профиль
                      </Link>
                    )}
                  </article>
                ))}
            </div>
          </div>
        </div>}
      </main>
    </div>
  );
}
