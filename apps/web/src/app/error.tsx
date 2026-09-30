'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-ink-950">Что-то пошло не так</h1>
      <p className="mt-2 max-w-md text-sm text-ink-600">Мы уже получили сигнал об ошибке. Попробуйте ещё раз или вернитесь на главную.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Повторить
        </button>
        <Link href="/" className="btn-secondary">
          На главную
        </Link>
      </div>
    </div>
  );
}
