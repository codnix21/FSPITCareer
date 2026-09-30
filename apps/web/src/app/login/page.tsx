'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { SiteHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { dashboardPath, saveAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      saveAuth(res.accessToken, res.user);
      router.push(dashboardPath(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Вход</h1>
        <p className="mt-2 text-sm text-ink-500">Войдите в аккаунт, чтобы продолжить работу.</p>

        <form onSubmit={onSubmit} className="card mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.ru"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label !mb-0" htmlFor="password">
                Пароль
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-700">
                Забыли пароль?
              </Link>
            </div>
            <input
              id="password"
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Введите пароль"
              minLength={8}
            />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-500">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-brand-700">
            Создать профиль
          </Link>
        </p>
      </div>
    </div>
  );
}
