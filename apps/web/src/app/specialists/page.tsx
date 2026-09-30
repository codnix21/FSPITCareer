'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorBox, SiteHeader, SkillChips, SkeletonCards } from '@/components/ui';
import { api } from '@/lib/api';
import { experienceLabel, FORMAT_LABEL, formatSalaryShort, GRADE_LABEL, ROLE_OPTIONS, TECH_OPTIONS } from '@/lib/labels';

export default function SpecialistsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const res = await api(`/candidates?${qs.toString()}`, { auth: false });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить специалистов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Специалисты</h1>
        <p className="mt-2 text-ink-600">IT-профили с подтверждёнными достижениями ФСП.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
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
                <label className="label">Технология</label>
                <select className="field" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })}>
                  <option value="">Все</option>
                  {TECH_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                        <span className="badge bg-amber-50 text-amber-800">🏆 {c.achievements.length} достижения ФСП</span>
                      )}
                    </div>
                    <Link href="/login" className="btn-primary mt-4">
                      Войти, чтобы предложить вакансию
                    </Link>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
