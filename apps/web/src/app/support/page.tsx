'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/ui';
import { dashboardPath, getStoredUser, type AuthUser } from '@/lib/auth';

export default function SupportPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <h1 className="page-title text-ink-950">Поддержка</h1>
        <p className="mt-3 text-ink-600">Мы помогаем с доступом к аккаунту, профилем, вакансиями и предложениями.</p>
        <div className="card mt-8 space-y-3 text-sm">
          <p>
            <strong>Email:</strong>{' '}
            <a className="font-semibold text-brand-700" href="mailto:support@fsp-career.ru">
              support@fsp-career.ru
            </a>
          </p>
          <p className="text-ink-600">Ответ в рабочие дни обычно в течение одного рабочего дня.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link href={dashboardPath(user.role)} className="btn-primary">
              Перейти в кабинет
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-primary">
                Войти
              </Link>
              <Link href="/forgot-password" className="btn-secondary">
                Восстановить пароль
              </Link>
            </>
          )}
          {user && (
            <Link href="/forgot-password" className="btn-secondary">
              Восстановить пароль
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
