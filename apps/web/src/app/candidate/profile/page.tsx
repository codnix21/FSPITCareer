'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, ErrorBox, ExpandableSkillChips, FspAchievements, InitialsAvatar, Modal, ProgressBar, SkeletonCards, Spinner } from '@/components/ui';
import { SearchableSelect } from '@/components/searchable-select';
import { api } from '@/lib/api';
import {
  experienceLabel,
  FORMAT_LABEL,
  formatSalary,
  GRADE_LABEL,
  roleDisplay,
} from '@/lib/labels';
import { candidateNav } from '@/lib/nav';
import {
  optionFromValue,
  searchEducationInstitutions,
  searchReferenceCities,
  searchReferenceCompanies,
  searchReferenceEducation,
  searchReferencePositions,
  searchReferenceSkills,
} from '@/lib/reference';

const nav = candidateNav;

type SkillRow = {
  name: string;
  level: number;
  externalSource?: string;
  externalId?: string | null;
};
type ExpRow = { company: string; position: string; description: string; startDate: string; endDate: string; isCurrent: boolean };
type EduRow = { institution: string; degree: string; field: string; yearFrom: number; yearTo: number };

const emptySkill: SkillRow = { name: '', level: 3 };
const emptyExp: ExpRow = { company: '', position: '', description: '', startDate: '2022-01-01', endDate: '', isCurrent: true };
const emptyEdu: EduRow = { institution: '', degree: 'Высшее', field: '', yearFrom: 2018, yearTo: 2022 };

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
  const [resumeAnalysis, setResumeAnalysis] = useState<{
    role?: string;
    experience?: string | number;
    skills?: string[];
    notice?: string;
  } | null>(null);
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
        skills: p.skills.map((s: any) => ({
          name: s.skill.name,
          level: s.level,
          externalSource: s.skill.externalSource || undefined,
          externalId: s.skill.externalId || undefined,
        })),
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
    setResumeAnalysis(null);
    setAnalyzing(true);
    setLastResumeId(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await api('/resumes/upload', { method: 'POST', body: fd });
      setResumeMsg('Резюме проанализировано');
      const analyzed = await api(`/resumes/${uploaded.id}/analyze`, { method: 'POST' });
      setLastResumeId(uploaded.id);
      setResumeAnalysis({
        role: analyzed.found?.role,
        experience: analyzed.found?.experience,
        skills: analyzed.found?.skills || [],
        notice: analyzed.notice || 'Демонстрационный анализ',
      });
      await load();
    } catch (e: any) {
      setResumeMsg(e.message || 'Не удалось обработать резюме');
      setResumeAnalysis(null);
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
            <div className="flex flex-wrap items-start gap-4">
              <InitialsAvatar firstName={profile.user.firstName} lastName={profile.user.lastName} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950 md:text-3xl">
                  {profile.user.firstName} {profile.user.lastName}
                </h2>
                <p className="mt-1 text-base text-ink-700">
                  {profile.candidateCategory?.name ||
                    (profile.specialization?.name
                      ? `${profile.specialization.name} · ${GRADE_LABEL[profile.grade] || profile.grade}`
                      : `${roleDisplay(profile.roleTitle)} · ${GRADE_LABEL[profile.grade]}`)}
                </p>
                <p className="meta-row mt-3">
                  {profile.industry?.name ? <span>Отрасль: {profile.industry.name}</span> : null}
                  {profile.specialization?.name ? <span>Специализация: {profile.specialization.name}</span> : null}
                  <span>{experienceLabel(profile.experienceYears)}</span>
                  {profile.city ? <span>{profile.city}</span> : null}
                  <span>{FORMAT_LABEL[profile.workFormat]}</span>
                  <span>{formatSalary(profile.salaryFrom, profile.salaryTo)}</span>
                </p>
                {profile.isVerified && (
                  <p className="mt-3">
                    <span className="badge bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">Профиль подтверждён</span>
                  </p>
                )}
              </div>
            </div>
            {profile.about && <p className="mt-5 text-sm leading-relaxed text-ink-600">{profile.about}</p>}
          </section>

          <section className="card" id="skills">
            <h3 className="section-title">Ключевые навыки</h3>
            <div className="mt-3">
              <ExpandableSkillChips
                skills={(profile.skills || []).map((s: any) => ({ name: s.skill.name, level: s.level }))}
                limit={5}
              />
            </div>
          </section>

          <div id="achievements">
            <FspAchievements achievements={profile.achievements || []} />
          </div>

          <section className="card">
            <h3 className="section-title">Техническое тестирование</h3>
            {profile.assessment?.latest ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Статус: {profile.assessment.status === 'PASSED' ? 'Пройдено' : 'Не пройдено'} ·{' '}
                  {profile.assessment.latest.score}/100
                </p>
                <p>
                  Заявленный уровень: {GRADE_LABEL[profile.grade] || profile.grade}
                </p>
                <p>
                  Рекомендуемый уровень:{' '}
                  {GRADE_LABEL[profile.assessment.latest.recommendedGrade] ||
                    profile.assessment.latest.recommendedGrade}
                </p>
                {profile.candidateCategory?.name && (
                  <p>Категория специалиста: {profile.candidateCategory.name}</p>
                )}
                <ProgressBar value={profile.assessment.latest.score} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">
                Результатов пока нет — пройдите тест в разделе «Техническое тестирование»
              </p>
            )}
          </section>

          <section className="card" id="resume">
            <h3 className="section-title">Резюме</h3>
            {profile.resumes?.length && !analyzing && !resumeAnalysis ? (
              <div className="mt-3 space-y-2">
                {profile.resumes.map((r: any) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-ink-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">{r.originalName || 'Файл резюме'}</p>
                      <p className="text-xs text-ink-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ru-RU') : 'Загружено'}
                        {r.analysis ? ' · проанализировано' : ''}
                      </p>
                    </div>
                    <label className="btn-secondary !min-h-10 cursor-pointer !px-3 !py-2 text-xs">
                      Заменить
                      <input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-500">Резюме ещё не загружено.</p>
                <label className="btn-secondary mt-4 inline-flex cursor-pointer">
                  Загрузить PDF или DOCX
                  <input
                    className="sr-only"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={analyzing}
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                  />
                </label>
              </>
            )}
            {analyzing && <Spinner label="Анализ резюме" />}
            {resumeMsg && <p className="mt-3 text-sm font-medium text-ink-800">{resumeMsg}</p>}
            {resumeAnalysis && (
              <div className="mt-3 space-y-2 rounded-xl bg-ink-50 p-4 text-sm">
                <p>
                  <strong>Роль:</strong> {resumeAnalysis.role || '—'}
                </p>
                <p>
                  <strong>Опыт:</strong> {resumeAnalysis.experience ?? '—'}
                </p>
                <p>
                  <strong>Навыки:</strong> {(resumeAnalysis.skills || []).join(', ') || '—'}
                </p>
                <p className="text-xs text-ink-500">{resumeAnalysis.notice || 'Демонстрационный анализ'}</p>
              </div>
            )}
            {lastResumeId && (
              <button type="button" className="btn-primary mt-3" disabled={applying} onClick={applyResume}>
                {applying ? 'Применение…' : 'Применить к профилю'}
              </button>
            )}
          </section>

          {(profile.experiences?.length > 0 || true) && (
            <section className="card">
              <h3 className="section-title">Опыт работы</h3>
              {profile.experiences?.length ? (
                <ul className="mt-4 space-y-0">
                  {profile.experiences.map((exp: any, i: number) => (
                    <li key={exp.id || i} className="relative border-l border-ink-200 pb-6 pl-5 last:pb-0">
                      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600" />
                      <p className="font-medium text-ink-950">{exp.position}</p>
                      <p className="text-sm text-ink-600">{exp.company}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {exp.startDate ? new Date(exp.startDate).getFullYear() : '—'}
                        {' — '}
                        {exp.isCurrent || !exp.endDate ? 'настоящее время' : new Date(exp.endDate).getFullYear()}
                      </p>
                      {exp.description && <p className="mt-2 text-sm text-ink-600">{exp.description}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-500">Опыт не указан</p>
              )}
            </section>
          )}

          <section className="card">
            <h3 className="section-title">Образование</h3>
            {profile.educations?.length ? (
              <ul className="mt-4 space-y-4">
                {profile.educations.map((ed: any, i: number) => (
                  <li key={ed.id || i}>
                    <p className="font-medium text-ink-950">{ed.institution}</p>
                    <p className="text-sm text-ink-600">
                      {[ed.degree, ed.field].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      {ed.yearFrom}–{ed.yearTo}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Образование не указано</p>
            )}
          </section>

          <form onSubmit={save} className="card space-y-6">
            <h3 className="section-title">Редактировать профиль</h3>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Основная информация</p>
              <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <SearchableSelect
                label="Роль"
                placeholder="Выберите должность..."
                searchPlaceholder="Поиск должности..."
                value={optionFromValue(form.roleTitle, roleDisplay(form.roleTitle))}
                onChange={(opt) => opt && setForm({ ...form, roleTitle: opt.value })}
                onSearch={searchReferencePositions}
              />
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
                <SearchableSelect
                  label="Город"
                  placeholder="Выберите город..."
                  searchPlaceholder="Поиск города..."
                  value={form.city ? optionFromValue(form.city) : null}
                  onChange={(opt) => setForm({ ...form, city: opt?.value || '' })}
                  onSearch={searchReferenceCities}
                />
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
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">О себе</p>
              <textarea className="field min-h-24" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Навыки</p>
                <button type="button" className="btn-secondary !py-1.5" onClick={() => setSkillModal({ index: null, draft: { ...emptySkill } })}>
                  + Добавить навык
                </button>
              </div>
              {form.skills.length === 0 ? (
                <p className="text-sm text-ink-500">Навыки ещё не добавлены.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map((s, i) => (
                    <div
                      key={`${s.name}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink-50 px-2.5 py-1.5 text-sm ring-1 ring-ink-950/10"
                    >
                      <button
                        type="button"
                        className="font-medium text-ink-900 hover:text-brand-700"
                        onClick={() => setSkillModal({ index: i, draft: { ...s } })}
                        title="Изменить"
                      >
                        {s.name} · {s.level}/5
                      </button>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-white hover:text-red-600"
                        aria-label={`Удалить ${s.name}`}
                        onClick={() => setRemoveTarget({ kind: 'skill', index: i, label: s.name })}
                      >
                        ×
                      </button>
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
        description="Выберите навык из каталога и укажите уровень владения."
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
              <SearchableSelect
                label="Навык"
                placeholder="Выберите навык..."
                searchPlaceholder="Начните вводить навык..."
                idleHint="Начните вводить название навыка"
                emptyText="Навык не найден"
                value={skillModal.draft.name ? optionFromValue(skillModal.draft.name) : null}
                onChange={(opt) =>
                  setSkillModal({
                    ...skillModal,
                    draft: {
                      ...skillModal.draft,
                      name: opt?.value || '',
                      externalSource: (opt?.meta?.source as string) || undefined,
                      externalId: (opt?.meta?.externalId as string | null) ?? undefined,
                    },
                  })
                }
                onSearch={searchReferenceSkills}
              />
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
              <button type="submit" className="btn-primary flex-1" disabled={!skillModal.draft.name}>
                {skillModal.index == null ? 'Добавить навык' : 'Сохранить'}
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
                <SearchableSelect
                  label="Компания"
                  placeholder="Выберите компанию..."
                  searchPlaceholder="Поиск компании..."
                  value={expModal.draft.company ? optionFromValue(expModal.draft.company) : null}
                  onChange={(opt) =>
                    setExpModal({
                      ...expModal,
                      draft: { ...expModal.draft, company: opt?.value || expModal.draft.company },
                    })
                  }
                  onSearch={async (q) => {
                    const fromDb = await searchReferenceCompanies(q);
                    if (q.trim() && !fromDb.some((x) => x.value.toLowerCase() === q.trim().toLowerCase())) {
                      return [...fromDb, optionFromValue(q.trim())];
                    }
                    return fromDb;
                  }}
                />
                <p className="mt-1 text-xs text-ink-500">Можно выбрать из списка или оставить введённое название</p>
              </div>
              <div>
                <SearchableSelect
                  label="Должность"
                  placeholder="Выберите должность..."
                  searchPlaceholder="Поиск должности..."
                  value={expModal.draft.position ? optionFromValue(expModal.draft.position, roleDisplay(expModal.draft.position)) : null}
                  onChange={(opt) =>
                    setExpModal({
                      ...expModal,
                      draft: { ...expModal.draft, position: opt?.value || '' },
                    })
                  }
                  onSearch={searchReferencePositions}
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
              <SearchableSelect
                label="Учебное заведение"
                placeholder="Начните вводить вуз..."
                searchPlaceholder="Начните вводить учебное заведение..."
                idleHint="Начните вводить название учебного заведения"
                value={eduModal.draft.institution ? optionFromValue(eduModal.draft.institution) : null}
                onChange={(opt) =>
                  setEduModal({
                    ...eduModal,
                    draft: { ...eduModal.draft, institution: opt?.value || '' },
                  })
                }
                onSearch={searchEducationInstitutions}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SearchableSelect
                  label="Уровень образования"
                  placeholder="Выберите уровень..."
                  searchPlaceholder="Поиск уровня образования..."
                  minQueryLength={0}
                  value={eduModal.draft.degree ? optionFromValue(eduModal.draft.degree) : null}
                  onChange={(opt) =>
                    setEduModal({
                      ...eduModal,
                      draft: { ...eduModal.draft, degree: opt?.value || '' },
                    })
                  }
                  onSearch={searchReferenceEducation}
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
