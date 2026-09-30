'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, ConfirmDialog, EmptyState, ErrorBox, SkeletonCards } from '@/components/ui';
import { api } from '@/lib/api';
import { FORMAT_LABEL, OFFER_STATUS_LABEL } from '@/lib/labels';
import { employerNav } from '@/lib/nav';

const nav = employerNav;

export default function EmployerOffersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api('/offers');
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить предложения');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw() {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await api(`/offers/${confirmId}`, { method: 'PATCH', body: JSON.stringify({ status: 'WITHDRAWN' }) });
      setConfirmId(null);
      await load();
    } catch (e: any) {
      alert(e.message || 'Не удалось отозвать');
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <AppShell title="Предложения" nav={nav}>
      {loading && <SkeletonCards />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Нет предложений"
          description="Найдите специалиста и отправьте предложение о работе."
          action={
            <Link href="/employer/search" className="btn-primary">
              Найти специалистов
            </Link>
          }
        />
      )}
      <div className="grid gap-3">
        {items.map((o) => (
          <article key={o.id} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">
                {o.candidate?.firstName} {o.candidate?.lastName}
              </h3>
              <p className="text-sm text-ink-600">
                {o.vacancy?.title} · {o.salary ? `${new Intl.NumberFormat('ru-RU').format(o.salary)} ₽` : 'зарплата по вакансии'}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {FORMAT_LABEL[o.workFormat || o.vacancy?.workFormat] || ''} · {OFFER_STATUS_LABEL[o.status]}
              </p>
              {o.message && <p className="mt-2 text-sm text-ink-600">{o.message}</p>}
            </div>
            <div className="flex gap-2">
              {o.candidate?.candidateProfile?.id && (
                <Link href={`/employer/candidates/${o.candidate.candidateProfile.id}`} className="btn-secondary">
                  Профиль
                </Link>
              )}
              {o.status === 'PENDING' && (
                <button type="button" className="btn-ghost text-red-700" onClick={() => setConfirmId(o.id)}>
                  Отозвать
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        title="Отозвать предложение?"
        message="Кандидат больше не увидит это предложение как активное. Действие нельзя отменить."
        confirmLabel="Отозвать"
        danger
        loading={confirmLoading}
        onClose={() => setConfirmId(null)}
        onConfirm={withdraw}
      />
    </AppShell>
  );
}
