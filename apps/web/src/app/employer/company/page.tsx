'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell, ErrorBox, Modal, Spinner } from '@/components/ui';
import { SearchableSelect } from '@/components/searchable-select';
import { api } from '@/lib/api';
import { employerNav } from '@/lib/nav';
import { optionFromValue, searchReferenceCities } from '@/lib/reference';

const nav = employerNav;

export default function EmployerCompanyPage() {
  const [company, setCompany] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', website: '', city: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const c = await api('/companies/me');
      setCompany(c);
      setForm({
        name: c.name || '',
        description: c.description || '',
        website: c.website || '',
        city: c.city || '',
      });
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить профиль компании');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast('');
    try {
      const c = await api('/companies/me', { method: 'PUT', body: JSON.stringify(form) });
      setCompany(c);
      setModal(false);
      setToast('Профиль компании сохранён');
    } catch (err: any) {
      setToast(err.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Компания"
      nav={nav}
      actions={
        company ? (
          <button type="button" className="btn-primary !px-3 !py-2" onClick={() => setModal(true)}>
            Изменить
          </button>
        ) : undefined
      }
    >
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {company && (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <article className="card space-y-3">
            <h2 className="font-display text-2xl font-bold">{company.name}</h2>
            <p className="text-sm leading-relaxed text-ink-600">{company.description || 'Описание пока не заполнено.'}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Город</dt>
                <dd className="font-medium">{company.city || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Сайт</dt>
                <dd className="font-medium">{company.website || '—'}</dd>
              </div>
            </dl>
            <button type="button" className="btn-secondary" onClick={() => setModal(true)}>
              Редактировать
            </button>
          </article>

          <aside className="card h-fit space-y-2 text-sm">
            <p className="font-semibold">Сводка</p>
            <p>Вакансий: {company._count?.vacancies ?? 0}</p>
            <p>Предложений: {company._count?.offers ?? 0}</p>
            <p>Контакт: {company.user?.email}</p>
          </aside>
        </div>
      )}

      <Modal open={modal} title="Редактирование компании" onClose={() => setModal(false)} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Название компании</label>
            <input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Описание</label>
            <textarea className="field min-h-28" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Сайт</label>
              <input className="field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
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
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setModal(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
