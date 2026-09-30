import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <h1 className="font-display text-3xl font-bold">Поддержка</h1>
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
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="btn-primary">
            Войти
          </Link>
          <Link href="/forgot-password" className="btn-secondary">
            Восстановить пароль
          </Link>
        </div>
      </div>
    </div>
  );
}
