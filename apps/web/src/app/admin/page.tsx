'use client';

import { useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, ErrorBox, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { GRADE_LABEL, OFFER_STATUS_LABEL, ROLE_LABEL, VACANCY_STATUS_LABEL } from '@/lib/labels';
import { adminNav } from '@/lib/nav';

const nav = adminNav;

function BarChart({ data, labelKey = 'label' }: { data: { label?: string; date?: string; value: number }[]; labelKey?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const label = (d as any)[labelKey] || d.date || '';
        return (
          <div key={label} className="grid grid-cols-[120px_1fr_40px] items-center gap-2 text-sm">
            <span className="truncate text-ink-600">{label}</span>
            <div className="h-2 rounded-full bg-ink-100">
              <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="text-right font-medium">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [tab, setTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmUser, setConfirmUser] = useState<any | null>(null);
  const [confirmVacancy, setConfirmVacancy] = useState<any | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTab(params.get('tab') || 'stats');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [s, u, c, cand, v, a] = await Promise.all([
          api('/admin/stats'),
          api('/admin/users'),
          api('/admin/companies'),
          api('/admin/candidates'),
          api('/admin/vacancies'),
          api('/admin/achievements'),
        ]);
        setStats(s);
        setUsers(u);
        setCompanies(c);
        setCandidates(cand.items || []);
        setVacancies(v.items || []);
        setAchievements(a);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить админ-панель');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleUser() {
    if (!confirmUser) return;
    setConfirmLoading(true);
    try {
      await api(`/admin/users/${confirmUser.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !confirmUser.isActive }),
      });
      setUsers((prev) => prev.map((x) => (x.id === confirmUser.id ? { ...x, isActive: !x.isActive } : x)));
      setConfirmUser(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function closeVacancy() {
    if (!confirmVacancy) return;
    setConfirmLoading(true);
    try {
      await api(`/admin/vacancies/${confirmVacancy.id}/close`, { method: 'POST' });
      setVacancies((prev) => prev.map((x) => (x.id === confirmVacancy.id ? { ...x, status: 'CLOSED' } : x)));
      setConfirmVacancy(null);
    } catch (e: any) {
      alert(e.message || 'Не удалось закрыть');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function exportCsv(entity: string) {
    const { getStoredToken } = await import('@/lib/auth');
    const { API_URL } = await import('@/lib/api');
    const token = getStoredToken();
    const res = await fetch(`${API_URL}/admin/export?entity=${entity}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      alert('Не удалось экспортировать данные');
      return;
    }
    const data = await res.blob();
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Админ-панель" nav={nav}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ['stats', 'Статистика'],
          ['users', 'Пользователи'],
          ['companies', 'Компании'],
          ['candidates', 'Кандидаты'],
          ['vacancies', 'Вакансии'],
          ['achievements', 'Достижения ФСП'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setTab(key);
              window.history.replaceState(null, '', key === 'stats' ? '/admin' : `/admin?tab=${key}`);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {!loading && !error && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['users', 'Пользователи'],
            ['candidates', 'Кандидаты'],
            ['vacancies', 'Вакансии'],
            ['offers', 'Предложения'],
          ].map(([entity, label]) => (
            <button key={entity} type="button" className="btn-ghost" onClick={() => exportCsv(entity)}>
              Скачать CSV: {label}
            </button>
          ))}
        </div>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox message={error} />}

      {!loading && !error && tab === 'stats' && stats && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Пользователей', stats.users],
              ['Кандидатов', stats.candidates],
              ['Работодателей', stats.employers],
              ['Вакансий', stats.vacancies],
              ['Предложений', stats.offers],
              ['Достижений ФСП', stats.achievements],
            ].map(([label, value]) => (
              <div key={label as string} className="card">
                <p className="text-sm text-ink-500">{label}</p>
                <p className="mt-2 text-3xl font-bold">{value as number}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 font-semibold">Кандидаты по грейду</h3>
              <BarChart data={stats.charts.candidatesByGrade.map((x: any) => ({ label: GRADE_LABEL[x.label] || x.label, value: x.value }))} />
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">Вакансии</h3>
              <BarChart data={stats.charts.vacanciesByRole} />
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">Предложения</h3>
              <BarChart
                data={stats.charts.offersByStatus.map((x: any) => ({
                  label: OFFER_STATUS_LABEL[x.label] || x.label,
                  value: x.value,
                }))}
              />
            </div>
            <div className="card">
              <h3 className="mb-3 font-semibold">Активность платформы</h3>
              <BarChart data={stats.charts.activity} labelKey="date" />
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'users' && (
        <div className="space-y-2 md:hidden">
          {users.map((u) => (
            <div key={u.id} className="card text-sm">
              <p className="font-semibold">
                {u.firstName} {u.lastName}
              </p>
              <p>{u.email}</p>
              <p className="mb-2">{ROLE_LABEL[u.role]}</p>
              <button type="button" className="btn-secondary !py-1" onClick={() => setConfirmUser(u)}>
                {u.isActive ? 'Активен' : 'Отключён'}
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && tab === 'users' && (
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-ink-500">
                <th className="py-2">Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-50">
                  <td className="py-2">
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <button type="button" className="btn-secondary !py-1" onClick={() => setConfirmUser(u)}>
                      {u.isActive ? 'Активен' : 'Отключён'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && tab === 'companies' && (
        <div className="grid gap-3">
          {companies.map((c) => (
            <div key={c.id} className="card">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-ink-500">
                {c.city || '—'} · вакансий: {c._count?.vacancies ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'candidates' && (
        <div className="grid gap-3">
          {candidates.map((c) => (
            <div key={c.id} className="card">
              <p className="font-semibold">
                {c.user.firstName} {c.user.lastName}
              </p>
              <p className="text-sm text-ink-600">
                {c.roleTitle} · {GRADE_LABEL[c.grade]}
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'vacancies' && (
        <div className="grid gap-3">
          {vacancies.map((v) => (
            <div key={v.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{v.title}</p>
                <p className="text-sm text-ink-600">
                  {v.company?.name} · {VACANCY_STATUS_LABEL[v.status]}
                </p>
              </div>
              {v.status === 'ACTIVE' && (
                <button type="button" className="btn-secondary" onClick={() => setConfirmVacancy(v)}>
                  Закрыть
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tab === 'achievements' && (
        <div className="grid gap-3">
          {achievements.map((a) => (
            <div key={a.id} className="card">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-ink-600">
                {a.candidate?.user?.firstName} {a.candidate?.user?.lastName} · {a.year} · {a.status}
              </p>
              <span className="badge mt-2 bg-brand-50 text-brand-800">Подтверждено ФСП</span>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.isActive ? 'Отключить пользователя?' : 'Включить пользователя?'}
        message={`${confirmUser?.firstName || ''} ${confirmUser?.lastName || ''} (${confirmUser?.email || ''}) ${
          confirmUser?.isActive ? 'потеряет доступ к платформе.' : 'снова сможет войти.'
        }`}
        confirmLabel={confirmUser?.isActive ? 'Отключить' : 'Включить'}
        danger={!!confirmUser?.isActive}
        loading={confirmLoading}
        onClose={() => setConfirmUser(null)}
        onConfirm={toggleUser}
      />

      <ConfirmDialog
        open={!!confirmVacancy}
        title="Закрыть вакансию?"
        message={`Вакансия «${confirmVacancy?.title || ''}» станет недоступна для поиска.`}
        confirmLabel="Закрыть"
        danger
        loading={confirmLoading}
        onClose={() => setConfirmVacancy(null)}
        onConfirm={closeVacancy}
      />
    </AppShell>
  );
}
