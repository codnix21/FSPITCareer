'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, EmptyState, ErrorBox, Modal, SkillChips, Spinner } from '@/components/ui';
import { SearchableMultiSelect, SearchableSelect, type SelectOption } from '@/components/searchable-select';
import { api } from '@/lib/api';
import {
  FORMAT_LABEL,
  formatSalary,
  GRADE_LABEL,
  roleDisplay,
  VACANCY_STATUS_LABEL,
} from '@/lib/labels';
import { employerNav } from '@/lib/nav';
import { optionFromValue, searchReferencePositions, searchReferenceSkills } from '@/lib/reference';

const emptyForm = {
  title: '',
  roleTitle: 'Backend Developer',
  grade: 'MIDDLE',
  experienceFrom: 1,
  experienceTo: 5,
  salaryFrom: 200000,
  salaryTo: 250000,
  workFormat: 'REMOTE',
  requirements: '',
  description: '',
  technologies: [] as string[],
  industryId: '',
  specializationId: '',
};

const WIZARD = ['Основная информация', 'Требования', 'Условия', 'Предпросмотр', 'Публикация'];

export default function EmployerVacanciesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'close' | 'delete'; id: string; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [published, setPublished] = useState<{ id: string; title: string; count: number } | null>(null);
  const [specializations, setSpecializations] = useState<{ id: string; name: string; industryId: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await api('/vacancies/employer/mine');
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить вакансии');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api('/reference/specializations', { auth: false })
      .then((res) => setSpecializations(res.items || []))
      .catch(() => setSpecializations([]));
  }, []);

  function openCreate() {
    setEditId(null);
    const backend = specializations.find((s) => s.name.toLowerCase().includes('backend'));
    setForm({
      ...emptyForm,
      title: 'Backend Developer',
      technologies: ['Python', 'FastAPI', 'PostgreSQL'],
      specializationId: backend?.id || '',
      industryId: backend?.industryId || '',
      roleTitle: backend?.name || 'Backend Developer',
    });
    setStep(0);
    setFormError('');
    setModal(true);
  }

  function openEdit(v: any) {
    setEditId(v.id);
    setForm({
      title: v.title || '',
      roleTitle: v.roleTitle || 'Backend Developer',
      grade: v.grade || 'MIDDLE',
      experienceFrom: v.experienceFrom ?? 0,
      experienceTo: v.experienceTo ?? v.experienceFrom ?? 0,
      salaryFrom: v.salaryFrom ?? 0,
      salaryTo: v.salaryTo ?? 0,
      workFormat: v.workFormat || 'REMOTE',
      requirements: v.requirements || '',
      description: v.description || '',
      technologies: (v.skills || []).map((s: any) => s.skill?.name || s).filter(Boolean),
      industryId: v.industryId || v.industry?.id || '',
      specializationId: v.specializationId || v.specialization?.id || '',
    });
    setStep(0);
    setFormError('');
    setModal(true);
  }

  async function saveVacancy(e?: FormEvent) {
    e?.preventDefault();
    setFormError('');
    if (!form.title.trim()) {
      setFormError('Укажите название вакансии');
      setStep(0);
      return;
    }
    if (form.technologies.length === 0) {
      setFormError('Добавьте хотя бы одну технологию');
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      let createdId = editId;
      if (editId) {
        await api(`/vacancies/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const created = await api('/vacancies', { method: 'POST', body: JSON.stringify(payload) });
        createdId = created.id;
      }
      setModal(false);
      setEditId(null);
      await load();

      if (createdId && !editId) {
        let count = 0;
        try {
          const matched = await api(`/matching/vacancies/${createdId}`);
          count = matched.total ?? matched.items?.length ?? 0;
        } catch {
          /* ignore */
        }
        setPublished({ id: createdId, title: form.title, count });
      }
    } catch (err: any) {
      setFormError(err.message || 'Не удалось сохранить вакансию');
    } finally {
      setSaving(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.type === 'close') {
        await api(`/vacancies/${confirm.id}/close`, { method: 'POST' });
      } else {
        await api(`/vacancies/${confirm.id}`, { method: 'DELETE' });
      }
      setConfirm(null);
      await load();
    } catch (err: any) {
      setFormError(err.message || 'Операция не выполнена');
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <AppShell
      title="Вакансии"
      nav={employerNav}
      actions={
        <button type="button" className="btn-primary !px-3 !py-2" onClick={openCreate}>
          Создать
        </button>
      }
    >
      {published && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-950">
          <h2 className="font-display text-xl font-bold">Вакансия опубликована</h2>
          <p className="mt-2 text-sm">
            «{published.title}»: мы нашли <strong>{published.count}</strong> подходящих специалистов.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/employer/search?vacancyId=${published.id}`} className="btn-primary">
              Посмотреть специалистов
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setPublished(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {loading && <Spinner label="Загрузка вакансий" />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && !published && (
        <EmptyState
          title="У вас пока нет вакансий"
          description="Создайте первую вакансию, чтобы найти подходящих IT-специалистов."
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Создать вакансию
            </button>
          }
        />
      )}

      <div className="grid gap-3">
        {items.map((v) => (
          <article key={v.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold">{v.title}</h3>
                <p className="mt-1 text-sm text-ink-600">
                  {roleDisplay(v.roleTitle)} · {GRADE_LABEL[v.grade]} · {VACANCY_STATUS_LABEL[v.status]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.status === 'ACTIVE' && (
                  <Link href={`/employer/search?vacancyId=${v.id}`} className="btn-primary">
                    Найти специалистов
                  </Link>
                )}
                <Link href={`/vacancies/${v.id}`} className="btn-secondary">
                  Открыть
                </Link>
                {v.status !== 'CLOSED' && (
                  <button type="button" className="btn-ghost" onClick={() => openEdit(v)}>
                    Изменить
                  </button>
                )}
                {v.status === 'ACTIVE' && (
                  <button type="button" className="btn-ghost" onClick={() => setConfirm({ type: 'close', id: v.id, title: v.title })}>
                    Закрыть
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost text-red-700"
                  onClick={() => setConfirm({ type: 'delete', id: v.id, title: v.title })}
                >
                  Удалить
                </button>
              </div>
            </div>

            {v.description && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Что предстоит делать</p>
                <p className="mt-1 text-sm text-ink-700">{v.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Что важно</p>
              <div className="mt-2">
                <SkillChips skills={(v.skills || []).map((s: any) => s.skill.name)} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Условия</p>
              <p className="mt-1 text-sm font-medium text-ink-800">
                {formatSalary(v.salaryFrom, v.salaryTo)} · {FORMAT_LABEL[v.workFormat]} · {GRADE_LABEL[v.grade]}
              </p>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={modal}
        title={editId ? 'Редактирование вакансии' : WIZARD[Math.min(step, WIZARD.length - 1)]}
        onClose={() => setModal(false)}
        size="lg"
      >
        <div className="mb-4 flex flex-wrap gap-1">
          {WIZARD.slice(0, 4).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${step === i ? 'bg-ink-950 text-white' : 'bg-ink-50 text-ink-600'}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) setStep(step + 1);
            else void saveVacancy();
          }}
          className="space-y-3"
        >
          {step === 0 && (
            <>
              <div>
                <label className="label" htmlFor="v-title">
                  Название
                </label>
                <input id="v-title" className="field" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="v-spec">
                  Специализация
                </label>
                <select
                  id="v-spec"
                  className="field"
                  value={form.specializationId}
                  onChange={(e) => {
                    const spec = specializations.find((s) => s.id === e.target.value);
                    setForm({
                      ...form,
                      specializationId: e.target.value,
                      industryId: spec?.industryId || '',
                      roleTitle: spec?.name || form.roleTitle,
                      title: form.title || spec?.name || '',
                    });
                  }}
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
              <div>
                <SearchableSelect
                  label="Должность (отображение)"
                  placeholder="Выберите должность..."
                  searchPlaceholder="Начните вводить должность..."
                  idleHint="Начните вводить должность"
                  value={optionFromValue(form.roleTitle, roleDisplay(form.roleTitle))}
                  onChange={(opt) => {
                    if (!opt) return;
                    setForm({ ...form, roleTitle: opt.value, title: form.title || opt.value });
                  }}
                  onSearch={searchReferencePositions}
                />
              </div>
              <div>
                <label className="label" htmlFor="v-desc">
                  Что предстоит делать
                </label>
                <textarea
                  id="v-desc"
                  className="field min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Кратко опишите задачи"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="label" htmlFor="v-grade">
                  Уровень
                </label>
                <select id="v-grade" className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                  {Object.entries(GRADE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <SearchableMultiSelect
                  label="Навыки"
                  placeholder="Начните вводить навык..."
                  searchPlaceholder="Начните вводить навык..."
                  idleHint="Начните вводить название навыка"
                  value={form.technologies.map((t) => optionFromValue(t))}
                  onChange={(opts: SelectOption[]) => setForm({ ...form, technologies: opts.map((o) => o.value) })}
                  onSearch={searchReferenceSkills}
                />
              </div>
              <div>
                <label className="label" htmlFor="v-req">
                  Дополнительные требования
                </label>
                <textarea
                  id="v-req"
                  className="field min-h-[80px]"
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Опыт от, лет</label>
                <input
                  type="number"
                  min={0}
                  className="field"
                  value={form.experienceFrom}
                  onChange={(e) => setForm({ ...form, experienceFrom: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Опыт до, лет</label>
                <input
                  type="number"
                  min={0}
                  className="field"
                  value={form.experienceTo}
                  onChange={(e) => setForm({ ...form, experienceTo: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Зарплата от, ₽</label>
                <input type="number" className="field" value={form.salaryFrom} onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Зарплата до, ₽</label>
                <input type="number" className="field" value={form.salaryTo} onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Формат</label>
                <select className="field" value={form.workFormat} onChange={(e) => setForm({ ...form, workFormat: e.target.value })}>
                  {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-xl bg-ink-50 p-4 text-sm">
              <p>
                <strong>{form.title}</strong>
              </p>
              <p>
                {roleDisplay(form.roleTitle)} · {GRADE_LABEL[form.grade]} · {FORMAT_LABEL[form.workFormat]}
              </p>
              <p>{formatSalary(form.salaryFrom, form.salaryTo)}</p>
              <SkillChips skills={form.technologies} />
              {form.description && <p className="text-ink-600">{form.description}</p>}
              <p className="text-xs text-ink-500">После публикации система сразу подберёт подходящих специалистов.</p>
            </div>
          )}

          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <div className="flex gap-2">
            {step > 0 ? (
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(step - 1)}>
                Назад
              </button>
            ) : (
              <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>
                Отмена
              </button>
            )}
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Публикация…' : step < 3 ? 'Далее' : editId ? 'Сохранить' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Удалить вакансию?' : 'Закрыть вакансию?'}
        message={
          confirm?.type === 'delete'
            ? `Вакансия «${confirm?.title}» будет удалена вместе со связанными предложениями.`
            : `Вакансия «${confirm?.title}» станет недоступна для поиска.`
        }
        confirmLabel={confirm?.type === 'delete' ? 'Удалить' : 'Закрыть вакансию'}
        danger={confirm?.type === 'delete'}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </AppShell>
  );
}
