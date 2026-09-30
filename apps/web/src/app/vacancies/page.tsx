'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorBox, SiteHeader, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { FORMAT_LABEL, formatSalary, GRADE_LABEL } from '@/lib/labels';

export default function VacanciesPublicPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/vacancies?status=ACTIVE', { auth: false });
        setItems(res.items || []);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить вакансии');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Вакансии</h1>
        <p className="mt-2 text-ink-600">Актуальные запросы работодателей на платформе.</p>
        {loading && <Spinner />}
        {error && <ErrorBox message={error} />}
        {!loading && !error && items.length === 0 && <EmptyState title="Нет вакансий" />}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((v) => (
            <article key={v.id} className="card">
              <h2 className="text-lg font-semibold">{v.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{v.company?.name}</p>
              <p className="mt-2 text-sm">
                {GRADE_LABEL[v.grade]} · {FORMAT_LABEL[v.workFormat]} · {formatSalary(v.salaryFrom, v.salaryTo)}
              </p>
              <div className="mt-3">
                <SkillChips skills={(v.skills || []).map((s: any) => s.skill.name)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/vacancies/${v.id}`} className="btn-primary">
                  Подробнее
                </Link>
                <Link href="/register" className="btn-secondary">
                  Создать профиль
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
