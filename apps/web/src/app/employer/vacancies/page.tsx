'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, EmptyState, ErrorBox, Modal, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { FORMAT_LABEL, formatSalary, GRADE_LABEL, ROLE_OPTIONS, TECH_OPTIONS, VACANCY_STATUS_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

const nav = employerNav;

const emptyForm = {
  title: '',
  roleTitle: 'Backend Developer',
  grade: 'MIDDLE',
  experienceFrom: 1,
  experienceTo: 5,
  salaryFrom: 150000,
  salaryTo: 250000,
  workFormat: 'REMOTE',
  requirements: '',
  description: '',
  technologies: [] as string[],
};

export default function EmployerVacanciesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'close' | 'delete'; id: string; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ ...emptyForm, title: 'Backend Developer', technologies: ['Python', 'FastAPI', 'PostgreSQL'] });
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
    });
    setFormError('');
    setModal(true);
  }

  async function saveVacancy(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) {
      setFormError('Укажите название вакансии');
      return;
    }
    if (form.technologies.length === 0) {
      setFormError('Добавьте хотя бы одну технологию');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editId) {
        await api(`/vacancies/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/vacancies', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModal(false);
      setEditId(null);
      await load();
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
      nav={nav}
      actions={
        <button type="button" className="btn-primary !px-3 !py-2" onClick={openCreate}>
          Создать
        </button>
      }
    >
      {loading && <Spinner label="Загрузка вакансий" />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {formError && !modal && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Нет вакансий"
          description="Создайте первую вакансию, чтобы искать специалистов."
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Создать вакансию
            </button>
          }
        />
      )}

      <div className="grid gap-3">
        {items.map((v) => (
          <article key={v.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm text-ink-600">
                  {GRADE_LABEL[v.grade]} · {FORMAT_LABEL[v.workFormat]} · {VACANCY_STATUS_LABEL[v.status]}
                </p>
                <p className="mt-2 text-sm font-medium">{formatSalary(v.salaryFrom, v.salaryTo)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.status === 'ACTIVE' && (
                  <Link href={`/employer/search?vacancyId=${v.id}`} className="btn-primary">
                    Найти
                  </Link>
                )}
                <Link href={`/vacancies/${v.id}`} className="btn-secondary">
                  Открыть
                </Link>
                {v.status !== 'CLOSED' && (
                  <button type="button" className="btn-secondary" onClick={() => openEdit(v)}>
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
            <div className="mt-3">
              <SkillChips skills={(v.skills || []).map((s: any) => s.skill.name)} />
            </div>
            {v.requirements && <p className="mt-3 text-sm text-ink-600">Требования: {v.requirements}</p>}
          </article>
        ))}
      </div>

      <Modal open={modal} title={editId ? 'Редактирование вакансии' : 'Новая вакансия'} onClose={() => setModal(false)} size="lg">
        <form onSubmit={saveVacancy} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Название</label>
              <input className="field" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Роль</label>
              <select
                className="field"
                value={form.roleTitle}
                onChange={(e) => setForm({ ...form, roleTitle: e.target.value, title: form.title || e.target.value })}
              >
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
              <label className="label">Зарплата от</label>
              <input
                type="number"
                className="field"
                value={form.salaryFrom}
                onChange={(e) => setForm({ ...form, salaryFrom: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Зарплата до</label>
              <input
                type="number"
                className="field"
                value={form.salaryTo}
                onChange={(e) => setForm({ ...form, salaryTo: Number(e.target.value) })}
              />
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
          <div>
            <label className="label">Технологии (через запятую)</label>
            <input
              className="field"
              value={form.technologies.join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  technologies: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder={TECH_OPTIONS.slice(0, 5).join(', ')}
            />
          </div>
          <div>
            <label className="label">Описание</label>
            <textarea
              className="field min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Требования</label>
            <textarea
              className="field min-h-[80px]"
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Сохранение…' : editId ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Удалить вакансию?' : 'Закрыть вакансию?'}
        message={
          confirm?.type === 'delete'
            ? `Вакансия «${confirm?.title}» будет удалена безвозвратно вместе со связанными предложениями.`
            : `Вакансия «${confirm?.title}» станет недоступна для поиска. Позже её можно будет только просмотреть.`
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
