'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, ProgressBar, Spinner } from '@/components/ui';
import { SearchableMultiSelect, SearchableSelect } from '@/components/searchable-select';
import { api } from '@/lib/api';
import { employerNav } from '@/lib/nav';
import { optionFromValue, searchReferenceCities, searchReferenceSkills } from '@/lib/reference';

const nav = employerNav;

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    website: '',
    city: '',
  });
  const [vacancy, setVacancy] = useState({
    title: 'Backend Developer',
    roleTitle: 'Backend Developer',
    grade: 'MIDDLE',
    experienceFrom: 2,
    salaryFrom: 200000,
    salaryTo: 250000,
    workFormat: 'REMOTE',
    requirements: 'Опыт от 2 лет',
    technologies: ['Python', 'FastAPI', 'PostgreSQL'],
  });

  useEffect(() => {
    (async () => {
      try {
        const c = await api('/companies/me');
        if (c.onboardingCompleted) {
          router.replace('/employer/dashboard');
          return;
        }
        setForm({
          name: c.name || '',
          description: c.description || '',
          website: c.website || '',
          city: c.city || '',
        });
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить компанию');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function next(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (step === 0) {
        await api('/companies/me', { method: 'PUT', body: JSON.stringify(form) });
        setStep(1);
      } else {
        await api('/vacancies', {
          method: 'POST',
          body: JSON.stringify(vacancy),
        });
        await api('/companies/me', {
          method: 'PUT',
          body: JSON.stringify({ ...form, onboardingCompleted: true }),
        });
        router.push('/employer/search');
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Онбординг работодателя" nav={nav}>
      {loading && <Spinner />}
      {!loading && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="card">
            <p className="text-sm text-ink-500">Шаг {step + 1} из 2</p>
            <div className="mt-3">
              <ProgressBar value={((step + 1) / 2) * 100} />
            </div>
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <form onSubmit={next} className="card space-y-4">
            {step === 0 ? (
              <>
                <h2 className="font-semibold">Профиль компании</h2>
                <div>
                  <label className="label">Название</label>
                  <input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Описание</label>
                  <textarea className="field min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Чем занимается компания" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Сайт</label>
                    <input className="field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
                  </div>
                  <SearchableSelect
                    label="Город"
                    placeholder="Выберите город..."
                    searchPlaceholder="Поиск города..."
                    value={form.city ? optionFromValue(form.city) : null}
                    onChange={(opt) => setForm({ ...form, city: opt?.value || '' })}
                    onSearch={searchReferenceCities}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="font-semibold">Первая вакансия</h2>
                <p className="text-sm text-ink-500">Создайте запрос, чтобы сразу перейти к поиску специалистов.</p>
                <div>
                  <label className="label">Название</label>
                  <input className="field" value={vacancy.title} onChange={(e) => setVacancy({ ...vacancy, title: e.target.value, roleTitle: e.target.value })} />
                </div>
                <SearchableMultiSelect
                  label="Технологии"
                  placeholder="Начните вводить навык..."
                  searchPlaceholder="Начните вводить навык..."
                  idleHint="Начните вводить название навыка"
                  value={vacancy.technologies.map((t) => optionFromValue(t))}
                  onChange={(opts) => setVacancy({ ...vacancy, technologies: opts.map((o) => o.value) })}
                  onSearch={searchReferenceSkills}
                />
              </>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Сохранение…' : step === 0 ? 'Далее' : 'Создать и найти специалистов'}
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}
