import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="font-display text-3xl font-bold">Политика конфиденциальности</h1>
        <p className="mt-2 text-sm text-ink-500">Редакция от 26 сентября 2026 г.</p>
        <div className="prose mt-8 space-y-4 text-sm leading-relaxed text-ink-700">
          <p>
            FSP IT Career обрабатывает персональные данные пользователей для предоставления сервиса подбора IT-специалистов:
            регистрационные данные, профиль, резюме, результаты сопоставления и служебные журналы безопасности.
          </p>
          <p>
            Данные не передаются третьим лицам вне целей работы платформы, за исключением случаев, предусмотренных законом, и
            интеграций, явно запрошенных пользователем (например, синхронизация достижений ФСП).
          </p>
          <p>
            Вы можете запросить уточнение, обновление или удаление данных через{' '}
            <Link href="/support" className="font-semibold text-brand-700">
              поддержку
            </Link>
            .
          </p>
        </div>
        <Link href="/" className="btn-secondary mt-10 inline-flex">
          На главную
        </Link>
      </article>
    </div>
  );
}
