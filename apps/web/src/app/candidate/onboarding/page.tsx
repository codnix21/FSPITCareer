'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell, ProgressBar, Spinner } from '@/components/ui';
import { SearchableMultiSelect, SearchableSelect } from '@/components/searchable-select';
import { api } from '@/lib/api';
import { FORMAT_LABEL, GRADE_LABEL } from '@/lib/labels';
import { candidateNav } from '@/lib/nav';
import { optionFromValue, searchReferenceCities, searchReferenceSkills } from '@/lib/reference';
import { getStoredUser } from '@/lib/auth';

const nav = candidateNav;

const STEPS = ['Отрасль', 'Специализация', 'Уровень', 'Навыки', 'Подтверждение', 'Тестирование'];

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profileId, setProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [industries, setIndustries] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [form, setForm] = useState({
    industryId: '',
    specializationId: '',
    grade: 'MIDDLE',
    experienceYears: 1,
    salaryFrom: 150000,
    salaryTo: 200000,
    workFormat: 'REMOTE',
    city: '',
    about: '',
    skills: ['Python', 'Git'] as string[],
    fspParticipantId: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const user = getStoredUser();
        const me = await api('/auth/me');
        setEmailVerified(!!me.emailVerified);
        if (!me.emailVerified) {
          setLoading(false);
          return;
        }

        const [p, ind] = await Promise.all([api('/candidates/me'), api('/reference/industries', { auth: false })]);
        setProfileId(p.id);
        setIndustries(ind.items || []);
        if (p.onboardingCompleted && p.profileStatus === 'AVAILABLE') {
          router.replace('/candidate/dashboard');
          return;
        }
        setForm((f) => ({
          ...f,
          industryId: p.industryId || (ind.items?.[0]?.id ?? ''),
          specializationId: p.specializationId || '',
          grade: p.grade || f.grade,
          experienceYears: p.experienceYears || f.experienceYears,
          salaryFrom: p.salaryFrom || f.salaryFrom,
          salaryTo: p.salaryTo || f.salaryTo,
          workFormat: p.workFormat || f.workFormat,
          city: p.city || '',
          about: p.about || '',
          skills: p.skills?.length ? p.skills.map((s: any) => s.skill.name) : f.skills,
          fspParticipantId: p.fspParticipantId || '',
        }));
        if (p.industryId || ind.items?.[0]?.id) {
          const specs = await api(
            `/reference/specializations?industryId=${p.industryId || ind.items[0].id}`,
            { auth: false },
          );
          setSpecializations(specs.items || []);
        }
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function loadSpecs(industryId: string) {
    const specs = await api(`/reference/specializations?industryId=${industryId}`, { auth: false });
    setSpecializations(specs.items || []);
  }

  async function saveStep(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setError('');
    try {
      const spec = specializations.find((s) => s.id === form.specializationId);
      await api(`/candidates/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({
          industryId: form.industryId || undefined,
          specializationId: form.specializationId || undefined,
          grade: form.grade,
          roleTitle: spec?.name,
          experienceYears: form.experienceYears,
          salaryFrom: form.salaryFrom,
          salaryTo: form.salaryTo,
          workFormat: form.workFormat,
          city: form.city,
          about: form.about,
          fspParticipantId: form.fspParticipantId || undefined,
          skills: form.skills.map((name) => ({ name, level: 3 })),
          ...extra,
        }),
      });
    } catch (e: any) {
      setError(e.message || 'Не удалось сохранить');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function next(e?: FormEvent) {
    e?.preventDefault();
    try {
      if (step === 0 && !form.industryId) {
        setError('Выберите отрасль');
        return;
      }
      if (step === 1 && !form.specializationId) {
        setError('Выберите специализацию');
        return;
      }
      if (step === 3 && form.skills.length === 0) {
        setError('Добавьте хотя бы один навык');
        return;
      }

      if (step < 4) {
        await saveStep();
        setStep((s) => s + 1);
        return;
      }

      if (step === 4) {
        await saveStep({ onboardingCompleted: true });
        if (form.fspParticipantId) {
          try {
            await api(`/candidates/${profileId}/achievements/sync`, { method: 'POST' });
          } catch {
            /* optional */
          }
        }
        setStep(5);
        return;
      }

      router.push('/candidate/tests');
    } catch {
      /* shown */
    }
  }

  const industryName = industries.find((i) => i.id === form.industryId)?.name || '—';
  const specializationName = specializations.find((s) => s.id === form.specializationId)?.name || '—';

  if (!loading && !emailVerified) {
    return (
      <AppShell title="Онбординг соискателя" nav={nav}>
        <div className="card mx-auto max-w-lg space-y-4">
          <h2 className="section-title">Подтвердите email</h2>
          <p className="text-sm text-ink-600">
            Перед заполнением профиля нужно подтвердить адрес электронной почты.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/verify-email" className="btn-primary">
              Перейти к подтверждению
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  await api('/auth/resend-verification', { method: 'POST', body: '{}' });
                  setError('');
                  alert('Если письмо доступно, оно отправлено повторно. Проверьте консоль сервера в dev.');
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              Отправить письмо ещё раз
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Онбординг соискателя" nav={nav}>
      {loading && <Spinner label="Подготовка профиля" />}
      {!loading && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="card">
            <p className="text-sm text-ink-500">
              Шаг {step + 1} из {STEPS.length}: {STEPS[step]}
            </p>
            <div className="mt-3">
              <ProgressBar value={((step + 1) / STEPS.length) * 100} />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={next} className="card space-y-4">
            {step === 0 && (
              <div>
                <label className="label">Отрасль</label>
                <select
                  className="field"
                  value={form.industryId}
                  onChange={async (e) => {
                    const industryId = e.target.value;
                    setForm({ ...form, industryId, specializationId: '' });
                    await loadSpecs(industryId);
                  }}
                  required
                >
                  <option value="">Выберите отрасль</option>
                  {industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="label">Специализация</label>
                <select
                  className="field"
                  value={form.specializationId}
                  onChange={(e) => setForm({ ...form, specializationId: e.target.value })}
                  required
                >
                  <option value="">Выберите специализацию</option>
                  {specializations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="label">Предполагаемый уровень</label>
                  <select className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                    {Object.entries(GRADE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Опыт (лет)</label>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                  />
                </div>
                <SearchableSelect
                  label="Город"
                  placeholder="Выберите город..."
                  searchPlaceholder="Поиск города..."
                  value={form.city ? optionFromValue(form.city) : null}
                  onChange={(opt) => setForm({ ...form, city: opt?.value || '' })}
                  onSearch={searchReferenceCities}
                />
              </>
            )}

            {step === 3 && (
              <>
                <SearchableMultiSelect
                  label="Навыки"
                  placeholder="Начните вводить навык..."
                  searchPlaceholder="Начните вводить навык..."
                  idleHint="Начните вводить название навыка"
                  value={form.skills.map((s) => optionFromValue(s))}
                  onChange={(opts) => setForm({ ...form, skills: opts.map((o) => o.value) })}
                  onSearch={searchReferenceSkills}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Зарплата от</label>
                    <input className="field" type="number" value={form.salaryFrom} onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Зарплата до</label>
                    <input className="field" type="number" value={form.salaryTo} onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="label">Формат работы</label>
                  <select className="field" value={form.workFormat} onChange={(e) => setForm({ ...form, workFormat: e.target.value })}>
                    {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">О себе</label>
                  <textarea className="field min-h-24" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="space-y-2 text-sm text-ink-700">
                  <p>
                    <span className="text-ink-500">Отрасль:</span> {industryName}
                  </p>
                  <p>
                    <span className="text-ink-500">Специализация:</span> {specializationName}
                  </p>
                  <p>
                    <span className="text-ink-500">Предполагаемый уровень:</span> {GRADE_LABEL[form.grade]}
                  </p>
                  <p>
                    <span className="text-ink-500">Навыки:</span> {form.skills.join(', ')}
                  </p>
                </div>
                <div>
                  <label className="label">ID участника ФСП (необязательно)</label>
                  <input
                    className="field"
                    value={form.fspParticipantId}
                    onChange={(e) => setForm({ ...form, fspParticipantId: e.target.value })}
                    placeholder="fsp-001"
                  />
                </div>
                <p className="rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  После подтверждения профиль перейдёт в статус «требуется тестирование». Поиск работодателей откроется после технического теста.
                </p>
              </>
            )}

            {step === 5 && (
              <>
                <h3 className="section-title">Техническое тестирование</h3>
                <p className="text-sm text-ink-600">
                  Следующий шаг — пройти тест по специализации. Пока тест не завершён, профиль не попадает в подбор работодателей.
                </p>
                <p className="text-sm text-ink-500">
                  После подтверждения вы перейдёте к техническому тестированию. Результат определит рекомендуемый уровень и категорию специалиста.
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {step > 0 && step < 5 && (
                <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
                  Назад
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving
                  ? 'Сохранение…'
                  : step === 4
                    ? 'Подтвердить профиль'
                    : step === 5
                      ? 'Перейти к тестированию'
                      : 'Далее'}
              </button>
              {step === 5 && (
                <Link href="/candidate/dashboard" className="btn-secondary">
                  В кабинет
                </Link>
              )}
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
