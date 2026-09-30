'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { SiteHeader } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Заглушка до подключения почтового провайдера: всегда успешный UX без раскрытия существования email
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Восстановление пароля</h1>
        <p className="mt-2 text-sm text-ink-500">Укажите email — если аккаунт существует, мы отправим инструкцию.</p>

        {sent ? (
          <div className="card mt-6 space-y-3">
            <p className="font-semibold text-ink-900">Проверьте почту</p>
            <p className="text-sm text-ink-600">
              Если адрес {email} зарегистрирован, письмо уже в пути. Не забудьте папку «Спам».
            </p>
            <Link href="/login" className="btn-primary inline-flex">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ru"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Отправка…' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-ink-500">
          Нужна помощь?{' '}
          <Link href="/support" className="font-semibold text-brand-700">
            Написать в поддержку
          </Link>
        </p>
      </div>
    </div>
  );
}
