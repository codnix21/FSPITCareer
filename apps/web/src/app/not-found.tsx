import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-display text-6xl font-extrabold text-ink-950">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Страница не найдена</h1>
        <p className="mt-2 text-ink-600">Проверьте адрес или вернитесь на главную.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            На главную
          </Link>
          <Link href="/support" className="btn-secondary">
            Поддержка
          </Link>
        </div>
      </div>
    </div>
  );
}
