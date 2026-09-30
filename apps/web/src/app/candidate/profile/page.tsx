'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, ErrorBox, Modal, ProgressBar, SkillChips, SkeletonCards, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import {
  experienceLabel,
  FORMAT_LABEL,
  formatSalary,
  GRADE_LABEL,
  ROLE_OPTIONS,
  TECH_OPTIONS,
} from '@/lib/labels';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

type SkillRow = { name: string; level: number };
type ExpRow = { company: string; position: string; description: string; startDate: string; endDate: string; isCurrent: boolean };
type EduRow = { institution: string; degree: string; field: string; yearFrom: number; yearTo: number };

const emptySkill: SkillRow = { name: 'Python', level: 3 };
const emptyExp: ExpRow = { company: '', position: '', description: '', startDate: '2022-01-01', endDate: '', isCurrent: true };
const emptyEdu: EduRow = { institution: '', degree: 'Бакалавр', field: '', yearFrom: 2018, yearTo: 2022 };

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    roleTitle: 'Backend Developer',
    grade: 'MIDDLE',
    experienceYears: 3,
    salaryFrom: 200000,
    salaryTo: 250000,
    workFormat: 'REMOTE',
    city: '',
    about: '',
    fspParticipantId: '',
    skills: [] as SkillRow[],
    experiences: [] as ExpRow[],
    educations: [] as EduRow[],
  });
  const [resumeMsg, setResumeMsg] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResumeId, setLastResumeId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [skillModal, setSkillModal] = useState<{ index: number | null; draft: SkillRow } | null>(null);
  const [expModal, setExpModal] = useState<{ index: number | null; draft: ExpRow } | null>(null);
  const [eduModal, setEduModal] = useState<{ index: number | null; draft: EduRow } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ kind: 'skill' | 'exp' | 'edu'; index: number; label: string } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const p = await api('/candidates/me');
      setProfile(p);
      setForm({
        roleTitle: p.roleTitle,
        grade: p.grade,
        experienceYears: p.experienceYears,
        salaryFrom: p.salaryFrom || 0,
        salaryTo: p.salaryTo || 0,
        workFormat: p.workFormat,
        city: p.city || '',
        about: p.about || '',
        fspParticipantId: p.fspParticipantId || '',
        skills: p.skills.map((s: any) => ({ name: s.skill.name, level: s.level })),
        experiences: (p.experiences || []).map((e: any) => ({
          company: e.company,
          position: e.position,
          description: e.description || '',
          startDate: e.startDate?.slice(0, 10) || '',
          endDate: e.endDate?.slice(0, 10) || '',
          isCurrent: e.isCurrent,
        })),
        educations: (p.educations || []).map((e: any) => ({
          institution: e.institution,
          degree: e.degree || '',
          field: e.field || '',
          yearFrom: e.yearFrom || 2018,
          yearTo: e.yearTo || 2022,
        })),
      });
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setToast('');
    try {
      const updated = await api(`/candidates/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          skills: form.skills,
          experiences: form.experiences,
          educations: form.educations,
        }),
      });
      setProfile(updated);
      setToast('Профиль сохранён');
    } catch (err: any) {
      setToast(err.message || 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  }

  async function syncFsp() {
    if (!profile) return;
    try {
      await api(`/candidates/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({ fspParticipantId: form.fspParticipantId }),
      });
      await api(`/candidates/${profile.id}/achievements/sync`, { method: 'POST' });
      setToast('Достижения ФСП обновлены');
      await load();
    } catch (e: any) {
      setToast(e.message || 'Не удалось синхронизировать ФСП');
    }
  }

  async function onUpload(file: File) {
    setResumeMsg('Резюме загружено');
    setAnalyzing(true);
    setLastResumeId(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api('/resumes/upload', { method: 'POST', body: fd });
      setResumeMsg('Резюме загружено\nАнализ профиля...');
      const analyzed = await api(`/resumes/${uploaded.id}/analyze`, { method: 'POST' });
      setLastResumeId(uploaded.id);
      setResumeMsg(
        `Резюме загружено\n\nАнализ профиля...\n\nНайдено:\nРоль: ${analyzed.found.role}\nОпыт: ${analyzed.found.experience}\n\nНавыки:\n${analyzed.found.skills.join('\n')}\n\n(${analyzed.notice})`,
      );
      await load();
    } catch (e: any) {
      setResumeMsg(e.message || 'Не удалось обработать резюме');
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyResume() {
    if (!lastResumeId) return;
    setApplying(true);
    try {
      const res = await api(`/resumes/${lastResumeId}/apply`, { method: 'POST' });
      setToast(res.message || 'Данные из резюме применены к профилю');
      await load();
    } catch (e: any) {
      setToast(e.message || 'Не удалось применить данные резюме');
    } finally {
      setApplying(false);
    }
  }

  return (
    <AppShell title="Профиль специалиста" nav={nav}>
      {loading && <SkeletonCards count={4} />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {profile && !loading && (
        <div className="space-y-5">
          <section className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {profile.user.firstName} {profile.user.lastName}
                </h2>
                <p className="mt-1 text-ink-600">{profile.roleTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="badge bg-ink-50">{GRADE_LABEL[profile.grade]}</span>
                  <span className="badge bg-ink-50">{experienceLabel(profile.experienceYears)}</span>
                  <span className="badge bg-ink-50">{FORMAT_LABEL[profile.workFormat]}</span>
                  <span className="badge bg-ink-50">{formatSalary(profile.salaryFrom, profile.salaryTo)}</span>
                </div>
                {profile.isVerified && (
                  <p className="mt-3">
                    <span className="badge bg-brand-50 text-brand-800">✓ Профиль подтверждён</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card">
            <h3 className="font-semibold">Навыки</h3>
            <div className="mt-3">
              <SkillChips skills={profile.skills.map((s: any) => `${s.skill.name} · ${s.level}/5`)} />
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Достижения ФСП</h3>
              <span className="badge bg-brand-50 text-brand-800">Подтверждено ФСП</span>
            </div>
            {profile.achievements?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {profile.achievements.map((a: any) => (
                  <article key={a.id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <p className="font-semibold">🏆 {a.title}</p>
                    <p className="mt-2 text-sm">Дисциплина: {a.discipline}</p>
                    <p className="text-sm">Результат: {a.place} место</p>
                    <p className="text-sm">Год: {a.year}</p>
                    <p className="text-sm">Статус: {a.status}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Нет достижений</p>
            )}
          </section>

          <section className="card">
            <h3 className="font-semibold">Результаты тестирования</h3>
            {profile.testAttempts?.length ? (
              <ul className="mt-3 space-y-3">
                {profile.testAttempts.map((t: any) => (
                  <li key={t.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{t.test?.title || 'Тест'}</span>
                      <span className="font-semibold">
                        {t.score}/{t.maxScore}
                      </span>
                    </div>
                    <ProgressBar value={t.score} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Результатов пока нет — пройдите тест в разделе «Тесты»</p>
            )}
          </section>

          <section className="card">
            <h3 className="font-semibold">Загрузить резюме</h3>
            <p className="mt-1 text-sm text-ink-500">
              PDF или DOCX. После загрузки система извлечёт роль, опыт и навыки — проверьте и примените к профилю.
            </p>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={analyzing}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            {analyzing && <Spinner label="Анализ профиля" />}
            {resumeMsg && <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm text-ink-700">{resumeMsg}</pre>}
            {lastResumeId && (
              <button type="button" className="btn-primary mt-3" disabled={applying} onClick={applyResume}>
                {applying ? 'Применение…' : 'Применить к профилю'}
              </button>
            )}
          </section>

          <form onSubmit={save} className="card space-y-4">
            <h3 className="font-semibold">Редактировать профиль</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Роль</label>
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
                <input className="field" type="number" step="0.5" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })} />
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
                <label className="label">Зарплата от</label>
                <input className="field" type="number" value={form.salaryFrom} onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Зарплата до</label>
                <input className="field" type="number" value={form.salaryTo} onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Город</label>
                <input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="label">ID участника ФСП</label>
                <div className="flex gap-2">
                  <input className="field" value={form.fspParticipantId} onChange={(e) => setForm({ ...form, fspParticipantId: e.target.value })} placeholder="fsp-001" />
                  <button type="button" className="btn-secondary shrink-0" onClick={syncFsp}>
                    Синхронизировать
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="label">О себе</label>
              <textarea className="field min-h-24" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Навыки</label>
                <button type="button" className="btn-secondary !py-1.5" onClick={() => setSkillModal({ index: null, draft: { ...emptySkill } })}>
                  Добавить
                </button>
              </div>
              {form.skills.length === 0 ? (
                <p className="text-sm text-ink-500">Навыки ещё не добавлены.</p>
              ) : (
                <div className="space-y-2">
                  {form.skills.map((s, i) => (
                    <div key={`${s.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-950/10 bg-ink-50 px-3 py-2">
                      <p className="text-sm font-medium">
                        {s.name} · уровень {s.level}/5
                      </p>
                      <div className="flex gap-2">
                        <button type="button" className="btn-ghost !py-1 !px-2" onClick={() => setSkillModal({ index: i, draft: { ...s } })}>
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !py-1 !px-2 text-red-700"
                          onClick={() => setRemoveTarget({ kind: 'skill', index: i, label: s.name })}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Опыт работы</label>
                <button type="button" className="btn-secondary !py-1.5" onClick={() => setExpModal({ index: null, draft: { ...emptyExp } })}>
                  Добавить
                </button>
              </div>
              {form.experiences.length === 0 ? (
                <p className="text-sm text-ink-500">Места работы ещё не добавлены.</p>
              ) : (
                <div className="space-y-2">
                  {form.experiences.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-ink-950/10 bg-ink-50 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{exp.position || 'Должность'}</p>
                          <p className="text-sm text-ink-600">{exp.company || 'Компания'}</p>
                          <p className="mt-1 text-xs text-ink-500">
                            {exp.startDate} — {exp.isCurrent ? 'н.в.' : exp.endDate || '—'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-ghost !py-1 !px-2" onClick={() => setExpModal({ index: i, draft: { ...exp } })}>
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !py-1 !px-2 text-red-700"
                            onClick={() => setRemoveTarget({ kind: 'exp', index: i, label: exp.position || exp.company || 'опыт' })}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Образование</label>
                <button type="button" className="btn-secondary !py-1.5" onClick={() => setEduModal({ index: null, draft: { ...emptyEdu } })}>
                  Добавить
                </button>
              </div>
              {form.educations.length === 0 ? (
                <p className="text-sm text-ink-500">Образование ещё не добавлено.</p>
              ) : (
                <div className="space-y-2">
                  {form.educations.map((ed, i) => (
                    <div key={i} className="rounded-lg border border-ink-950/10 bg-ink-50 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{ed.institution || 'Учебное заведение'}</p>
                          <p className="text-sm text-ink-600">
                            {ed.degree}
                            {ed.field ? ` · ${ed.field}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-ink-500">
                            {ed.yearFrom}–{ed.yearTo}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-ghost !py-1 !px-2" onClick={() => setEduModal({ index: i, draft: { ...ed } })}>
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !py-1 !px-2 text-red-700"
                            onClick={() => setRemoveTarget({ kind: 'edu', index: i, label: ed.institution || 'образование' })}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить профиль'}
            </button>
          </form>
        </div>
      )}

      <Modal
        open={!!skillModal}
        title={skillModal?.index == null ? 'Новый навык' : 'Изменить навык'}
        onClose={() => setSkillModal(null)}
      >
        {skillModal && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const skills = [...form.skills];
              if (skillModal.index == null) skills.push(skillModal.draft);
              else skills[skillModal.index] = skillModal.draft;
              setForm({ ...form, skills });
              setSkillModal(null);
            }}
          >
            <div>
              <label className="label">Навык</label>
              <input
                className="field"
                list="tech-list"
                required
                value={skillModal.draft.name}
                onChange={(e) => setSkillModal({ ...skillModal, draft: { ...skillModal.draft, name: e.target.value } })}
              />
              <datalist id="tech-list">
                {TECH_OPTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Уровень (1–5)</label>
              <input
                className="field"
                type="number"
                min={1}
                max={5}
                required
                value={skillModal.draft.level}
                onChange={(e) => setSkillModal({ ...skillModal, draft: { ...skillModal.draft, level: Number(e.target.value) } })}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setSkillModal(null)}>
                Отмена
              </button>
              <button type="submit" className="btn-primary flex-1">
                Сохранить
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!expModal} title={expModal?.index == null ? 'Новое место работы' : 'Изменить опыт'} onClose={() => setExpModal(null)} size="lg">
        {expModal && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const experiences = [...form.experiences];
              if (expModal.index == null) experiences.push(expModal.draft);
              else experiences[expModal.index] = expModal.draft;
              setForm({ ...form, experiences });
              setExpModal(null);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Компания</label>
                <input
                  className="field"
                  required
                  value={expModal.draft.company}
                  onChange={(e) => setExpModal({ ...expModal, draft: { ...expModal.draft, company: e.target.value } })}
                />
              </div>
              <div>
                <label className="label">Должность</label>
                <input
                  className="field"
                  required
                  value={expModal.draft.position}
                  onChange={(e) => setExpModal({ ...expModal, draft: { ...expModal.draft, position: e.target.value } })}
                />
              </div>
            </div>
            <div>
              <label className="label">Описание</label>
              <textarea
                className="field min-h-20"
                value={expModal.draft.description}
                onChange={(e) => setExpModal({ ...expModal, draft: { ...expModal.draft, description: e.target.value } })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Начало</label>
                <input
                  className="field"
                  type="date"
                  required
                  value={expModal.draft.startDate}
                  onChange={(e) => setExpModal({ ...expModal, draft: { ...expModal.draft, startDate: e.target.value } })}
                />
              </div>
              <div>
                <label className="label">Окончание</label>
                <input
                  className="field"
                  type="date"
                  disabled={expModal.draft.isCurrent}
                  value={expModal.draft.endDate}
                  onChange={(e) => setExpModal({ ...expModal, draft: { ...expModal.draft, endDate: e.target.value } })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={expModal.draft.isCurrent}
                onChange={(e) =>
                  setExpModal({
                    ...expModal,
                    draft: { ...expModal.draft, isCurrent: e.target.checked, endDate: e.target.checked ? '' : expModal.draft.endDate },
                  })
                }
              />
              Текущее место работы
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setExpModal(null)}>
                Отмена
              </button>
              <button type="submit" className="btn-primary flex-1">
                Сохранить
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!eduModal} title={eduModal?.index == null ? 'Новое образование' : 'Изменить образование'} onClose={() => setEduModal(null)}>
        {eduModal && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const educations = [...form.educations];
              if (eduModal.index == null) educations.push(eduModal.draft);
              else educations[eduModal.index] = eduModal.draft;
              setForm({ ...form, educations });
              setEduModal(null);
            }}
          >
            <div>
              <label className="label">Учебное заведение</label>
              <input
                className="field"
                required
                value={eduModal.draft.institution}
                onChange={(e) => setEduModal({ ...eduModal, draft: { ...eduModal.draft, institution: e.target.value } })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Степень</label>
                <input
                  className="field"
                  value={eduModal.draft.degree}
                  onChange={(e) => setEduModal({ ...eduModal, draft: { ...eduModal.draft, degree: e.target.value } })}
                />
              </div>
              <div>
                <label className="label">Специальность</label>
                <input
                  className="field"
                  value={eduModal.draft.field}
                  onChange={(e) => setEduModal({ ...eduModal, draft: { ...eduModal.draft, field: e.target.value } })}
                />
              </div>
              <div>
                <label className="label">Год начала</label>
                <input
                  className="field"
                  type="number"
                  value={eduModal.draft.yearFrom}
                  onChange={(e) => setEduModal({ ...eduModal, draft: { ...eduModal.draft, yearFrom: Number(e.target.value) } })}
                />
              </div>
              <div>
                <label className="label">Год окончания</label>
                <input
                  className="field"
                  type="number"
                  value={eduModal.draft.yearTo}
                  onChange={(e) => setEduModal({ ...eduModal, draft: { ...eduModal.draft, yearTo: Number(e.target.value) } })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEduModal(null)}>
                Отмена
              </button>
              <button type="submit" className="btn-primary flex-1">
                Сохранить
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        title="Удалить запись?"
        message={`«${removeTarget?.label}» будет убрана из формы. Не забудьте сохранить профиль.`}
        confirmLabel="Удалить"
        danger
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          if (removeTarget.kind === 'skill') {
            setForm({ ...form, skills: form.skills.filter((_, j) => j !== removeTarget.index) });
          } else if (removeTarget.kind === 'exp') {
            setForm({ ...form, experiences: form.experiences.filter((_, j) => j !== removeTarget.index) });
          } else {
            setForm({ ...form, educations: form.educations.filter((_, j) => j !== removeTarget.index) });
          }
          setRemoveTarget(null);
        }}
      />
    </AppShell>
  );
}
