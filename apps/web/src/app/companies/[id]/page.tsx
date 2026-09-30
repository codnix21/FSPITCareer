'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorBox, SiteHeader, SkillChips, SkeletonCards } from '@/components/ui';
import { api } from '@/lib/api';
import { FORMAT_LABEL, formatSalary, GRADE_LABEL } from '@/lib/labels';

export default function CompanyPublicPage() {
  const params = useParams();
  const id = params.id as string;
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const c = await api(`/companies/${id}`, { auth: false });
        setCompany(c);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить компанию');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        {loading && <SkeletonCards count={2} />}
        {error && <ErrorBox message={error} />}

        {company && (
          <div className="space-y-5">
            <section className="card">
              <h1 className="font-display text-3xl font-bold">{company.name}</h1>
              <p className="mt-2 text-sm text-ink-500">
                {company.city || 'Город не указан'}
                {company.website ? ` · ${company.website}` : ''}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-700">{company.description || 'Описание компании не заполнено.'}</p>
              <p className="mt-3 text-sm text-ink-500">
                Активных вакансий: {company.vacancies?.length ?? company._count?.vacancies ?? 0}
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Открытые вакансии</h2>
              {!company.vacancies?.length ? (
                <EmptyState title="Нет вакансий" />
              ) : (
                <div className="grid gap-3">
                  {company.vacancies.map((v: any) => (
                    <article key={v.id} className="card">
                      <h3 className="font-semibold">{v.title}</h3>
                      <p className="mt-1 text-sm text-ink-600">
                        {GRADE_LABEL[v.grade]} · {FORMAT_LABEL[v.workFormat]} · {formatSalary(v.salaryFrom, v.salaryTo)}
                      </p>
                      <Link href={`/vacancies/${v.id}`} className="btn-secondary mt-3">
                        Подробнее
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
