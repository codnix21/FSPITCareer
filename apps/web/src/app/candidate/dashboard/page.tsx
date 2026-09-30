'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, EmptyState, ErrorBox, MatchBadge, SkillChips, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatSalary, FORMAT_LABEL, OFFER_STATUS_LABEL } from '@/lib/labels';
import { candidateNav } from '@/lib/nav';

const nav = candidateNav;

export default function CandidateDashboardPage() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [confirm, setConfirm] = useState<{ id: string; status: 'ACCEPTED' | 'REJECTED'; title: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const me = await api('/candidates/me');
      const [matched, offs, notes] = await Promise.all([
        api(`/matching/candidates/${me.id}/vacancies`),
        api('/offers'),
        api('/notifications'),
      ]);
      setVacancies(matched.items || []);
      setOffers(offs.items || []);
      setNotifications(notes.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить панель');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await api(`/offers/${confirm.id}`, { method: 'PATCH', body: JSON.stringify({ status: confirm.status }) });
      setToast(confirm.status === 'ACCEPTED' ? 'Предложение принято' : 'Предложение отклонено');
      setConfirm(null);
      await load();
    } catch (e: any) {
      setToast(e.message || 'Не удалось обновить предложение');
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <AppShell title="Панель соискателя" nav={nav}>
      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {toast && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{toast}</p>}

      {!loading && !error && (
        <div className="space-y-8">
          {notifications.length > 0 && (
            <section className="space-y-2">
              {notifications.map((n) => (
                <div key={n.type} className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  <strong>{n.title}:</strong> {n.message}
                </div>
              ))}
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Входящие предложения</h2>
            {offers.length === 0 ? (
              <EmptyState title="Нет предложений" description="Когда работодатель отправит предложение, оно появится здесь." />
            ) : (
              <div className="grid gap-3">
                {offers.map((o) => (
                  <article key={o.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">{o.company?.name}</h3>
                      <p className="text-sm text-ink-600">{o.vacancy?.title}</p>
                      <p className="mt-1 text-sm">
                        {o.salary ? `${new Intl.NumberFormat('ru-RU').format(o.salary)} ₽` : formatSalary(o.vacancy?.salaryFrom, o.vacancy?.salaryTo)}
                        {' · '}
                        {FORMAT_LABEL[o.workFormat || o.vacancy?.workFormat] || ''}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">Статус: {OFFER_STATUS_LABEL[o.status]}</p>
                      {o.message && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">{o.message}</p>}
                    </div>
                    {o.status === 'PENDING' && (
                      <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:flex">
                        <button
                          type="button"
                          className="btn-primary min-h-11"
                          onClick={() => setConfirm({ id: o.id, status: 'ACCEPTED', title: o.vacancy?.title || o.company?.name })}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          className="btn-secondary min-h-11"
                          onClick={() => setConfirm({ id: o.id, status: 'REJECTED', title: o.vacancy?.title || o.company?.name })}
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Подходящие вакансии</h2>
            {vacancies.length === 0 ? (
              <EmptyState title="Нет вакансий" description="Заполните профиль подробнее, чтобы улучшить подбор." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {vacancies.slice(0, 8).map((v) => (
                  <article key={v.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{v.title}</h3>
                      <MatchBadge score={v.matchScore} />
                    </div>
                    <p className="mt-1 text-sm text-ink-500">{v.companyName}</p>
                    <div className="mt-3">
                      <SkillChips skills={(v.skills || []).slice(0, 5)} />
                    </div>
                    <p className="mt-3 text-sm">{formatSalary(v.salaryFrom, v.salaryTo)}</p>
                    {v.reasons?.length > 0 && (
                      <div className="mt-3 rounded-xl bg-ink-50 p-3">
                        <p className="text-sm font-semibold">Почему вам подходит</p>
                        <ul className="mt-2 space-y-1 text-sm text-ink-700">
                          {v.reasons.slice(0, 4).map((r: string) => (
                            <li key={r}>✓ {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link href={`/vacancies/${v.id}`} className="btn-secondary mt-4">
                      Подробнее
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.status === 'ACCEPTED' ? 'Принять предложение?' : 'Отклонить предложение?'}
        message={
          confirm?.status === 'ACCEPTED'
            ? `Вы принимаете предложение по вакансии «${confirm?.title}». Работодатель увидит ваш ответ.`
            : `Вы отклоняете предложение «${confirm?.title}». Это действие нельзя отменить.`
        }
        confirmLabel={confirm?.status === 'ACCEPTED' ? 'Принять' : 'Отклонить'}
        danger={confirm?.status === 'REJECTED'}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
        onConfirm={respond}
      />
    </AppShell>
  );
}
