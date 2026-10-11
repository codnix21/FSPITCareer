'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { SiteHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'CANDIDATE' | 'EMPLOYER'>('CANDIDATE');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = params.get('role');
    if (r === 'EMPLOYER' || r === 'CANDIDATE') setRole(r);
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; user: any }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          ...form,
          role,
          companyName: role === 'EMPLOYER' ? form.companyName : undefined,
          consentAccepted,
        }),
      });
      saveAuth(res.accessToken, { ...res.user, emailVerified: false });
      router.push('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Создать профиль</h1>
      <p className="mt-2 text-sm text-ink-500">Выберите роль и заполните основные данные.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Тип аккаунта</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`btn ${role === 'CANDIDATE' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRole('CANDIDATE')}
            >
              Соискатель
            </button>
            <button
              type="button"
              className={`btn ${role === 'EMPLOYER' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRole('EMPLOYER')}
            >
              Работодатель
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Имя</label>
            <input className="field" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <label className="label">Фамилия</label>
            <input className="field" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Пароль</label>
          <input
            className="field"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Минимум 8 символов"
          />
        </div>
        {role === 'EMPLOYER' && (
          <div>
            <label className="label">Название компании</label>
            <input className="field" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
        )}
        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            className="mt-1"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            required
          />
          <span>
            Согласен с{' '}
            <Link href="/privacy" className="font-semibold text-brand-700 underline">
              политикой конфиденциальности
            </Link>{' '}
            и{' '}
            <Link href="/terms" className="font-semibold text-brand-700 underline">
              условиями
            </Link>
          </span>
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !consentAccepted}>
          {loading ? 'Создание…' : 'Создать профиль'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-500">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="font-semibold text-brand-700">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Suspense fallback={<div className="p-12 text-center text-sm text-ink-500">Загрузка…</div>}>
        <RegisterInner />
      </Suspense>
    </div>
  );
}
