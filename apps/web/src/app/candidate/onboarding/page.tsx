'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, ProgressBar, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { FORMAT_LABEL, GRADE_LABEL, ROLE_OPTIONS, TECH_OPTIONS } from '@/lib/labels';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profileId, setProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    roleTitle: 'Backend Developer',
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
  const [resumeStatus, setResumeStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await api('/candidates/me');
        setProfileId(p.id);
        if (p.onboardingCompleted) {
          router.replace('/candidate/dashboard');
          return;
        }
        setForm((f) => ({
          ...f,
          roleTitle: p.roleTitle || f.roleTitle,
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
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function saveStep(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setError('');
    try {
      await api(`/candidates/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({
          roleTitle: form.roleTitle,
          grade: form.grade,
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
      if (step < 3) {
        await saveStep();
        setStep((s) => s + 1);
      } else {
        await saveStep({ onboardingCompleted: true, isVerified: true });
        if (form.fspParticipantId) {
          try {
            await api(`/candidates/${profileId}/achievements/sync`, { method: 'POST' });
          } catch {
            /* optional */
          }
        }
        router.push('/candidate/dashboard');
      }
    } catch {
      /* shown */
    }
  }

  async function onUpload(file: File) {
    setResumeStatus('Резюме загружено. Анализ профиля…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api('/resumes/upload', { method: 'POST', body: fd });
      const analyzed = await api(`/resumes/${uploaded.id}/analyze`, { method: 'POST' });
      setForm((f) => ({
        ...f,
        roleTitle: analyzed.found.role || f.roleTitle,
        skills: analyzed.found.skills?.length ? analyzed.found.skills : f.skills,
      }));
      setResumeStatus(
        `Найдено:\nРоль: ${analyzed.found.role}\nОпыт: ${analyzed.found.experience}\nНавыки: ${analyzed.found.skills.join(', ')}`,
      );
    } catch (e: any) {
      setResumeStatus(e.message || 'Не удалось обработать резюме');
    }
  }

  const steps = ['Роль и грейд', 'Навыки и условия', 'Резюме', 'ФСП и завершение'];

  return (
    <AppShell title="Онбординг соискателя" nav={nav}>
      {loading && <Spinner label="Подготовка профиля" />}
      {!loading && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="card">
            <p className="text-sm text-ink-500">
              Шаг {step + 1} из {steps.length}: {steps[step]}
            </p>
            <div className="mt-3">
              <ProgressBar value={((step + 1) / steps.length) * 100} />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={next} className="card space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className="label">Профессиональная роль</label>
                  <select className="field" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r}>{r}</option>
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
                  <label className="label">Опыт (лет)</label>
                  <input className="field" type="number" min={0} step={0.5} value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Город</label>
                  <input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Москва" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <label className="label">Технологии</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TECH_OPTIONS.map((t) => {
                      const on = form.skills.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`badge ${on ? 'bg-brand-100 text-brand-800' : 'bg-ink-50 text-ink-600'}`}
                          onClick={() =>
                            setForm({
                              ...form,
                              skills: on ? form.skills.filter((s) => s !== t) : [...form.skills, t],
                            })
                          }
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                  <textarea className="field min-h-24" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="Кратко о профессиональном опыте" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-ink-600">Загрузите PDF/DOCX — система структурирует профиль автоматически.</p>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                {resumeStatus && <pre className="whitespace-pre-wrap rounded-xl bg-ink-50 p-3 text-sm">{resumeStatus}</pre>}
                <p className="text-xs text-ink-400">Можно пропустить и заполнить навыки вручную на предыдущем шаге.</p>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-ink-600">
                  Укажите ID участника ФСП, чтобы подтянуть подтверждённые достижения.
                </p>
                <div>
                  <label className="label">ID участника ФСП</label>
                  <input className="field" value={form.fspParticipantId} onChange={(e) => setForm({ ...form, fspParticipantId: e.target.value })} placeholder="fsp-001" />
                </div>
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
                  После привязки достижения появятся в профиле и участвуют в подборе.
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {step > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
                  Назад
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Сохранение…' : step === 3 ? 'Завершить и открыть кабинет' : 'Далее'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
