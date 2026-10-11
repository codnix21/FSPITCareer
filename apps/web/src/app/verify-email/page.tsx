'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiteHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { dashboardPath, getStoredUser, saveAuth } from '@/lib/auth';

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = params.get('token');
    if (t) {
      setToken(t);
      void verify(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function verify(value: string) {
    setStatus('loading');
    setMessage('');
    try {
      await api('/auth/verify-email', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token: value }),
      });
      setStatus('ok');
      setMessage('Email подтверждён. Можно продолжить онбординг.');
      try {
        const me = await api('/auth/me');
        const stored = getStoredUser();
        if (stored) {
          saveAuth(localStorage.getItem('fsp_token') || '', { ...stored, emailVerified: true } as any);
        }
        router.push(me.role === 'CANDIDATE' ? '/candidate/onboarding' : dashboardPath(me.role));
      } catch {
        /* stay on page */
      }
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message || 'Не удалось подтвердить email');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await verify(token);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Подтверждение email</h1>
      <p className="mt-2 text-sm text-ink-500">Вставьте токен из письма или перейдите по ссылке из письма.</p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="label">Токен</label>
          <input className="field" value={token} onChange={(e) => setToken(e.target.value)} required minLength={10} />
        </div>
        {message && (
          <p className={`rounded-md px-3 py-2 text-sm ${status === 'ok' ? 'bg-brand-50 text-brand-900' : 'bg-red-50 text-red-700'}`}>
            {message}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Проверка…' : 'Подтвердить'}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-500">
        <Link href="/login" className="font-semibold text-brand-700">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Suspense fallback={<div className="p-8 text-center text-sm text-ink-500">Загрузка…</div>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
