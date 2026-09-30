import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="font-display text-3xl font-bold">Условия использования</h1>
        <p className="mt-2 text-sm text-ink-500">Редакция от 26 сентября 2026 г.</p>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink-700">
          <p>
            Используя FSP IT Career, вы подтверждаете, что предоставляете достоверные сведения о себе или компании и не
            используете платформу для спама, дискриминации или обхода правил безопасности.
          </p>
          <p>
            Показатель соответствия отражает совпадение профиля с требованиями вакансии и не является оценкой личности или
            профессиональной ценности человека.
          </p>
          <p>
            Администрация вправе ограничить доступ при нарушении правил или подозрении в мошенничестве.
          </p>
        </div>
        <Link href="/" className="btn-secondary mt-10 inline-flex">
          На главную
        </Link>
      </article>
    </div>
  );
}
