import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative min-h-[88vh] overflow-hidden">
          <div
            className="absolute inset-0 -z-10"
            aria-hidden
            style={{
              backgroundImage: `
                linear-gradient(105deg, rgba(11,15,23,0.88) 0%, rgba(11,15,23,0.55) 42%, rgba(20,48,219,0.35) 100%),
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23141d54'/%3E%3Cstop offset='1' stop-color='%230b0f17'/%3E%3C/linearGradient%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M40 0H0V40' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Crect width='1600' height='900' fill='url(%23grid)'/%3E%3Cpath d='M0 620 L320 480 L560 560 L820 360 L1100 500 L1400 280 L1600 340 L1600 900 L0 900 Z' fill='rgba(255,77,28,0.12)'/%3E%3Ccircle cx='1180' cy='220' r='180' fill='rgba(51,99,255,0.22)'/%3E%3C/svg%3E")
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <div className="mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 md:justify-center md:px-6 md:pb-24 md:pt-20">
            <div className="max-w-3xl text-white">
              <p className="animate-fade-up font-display text-3xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
                FSP IT Career
              </p>
              <span className="mt-4 block h-1 w-24 origin-left animate-slide-line bg-signal [animation-delay:180ms]" />
              <h1 className="animate-fade-up mt-6 font-display text-2xl font-bold leading-tight tracking-tight text-white/95 md:text-4xl lg:text-[2.75rem] [animation-delay:80ms]">
                Найдите IT-специалиста по реальным компетенциям
              </h1>
              <p className="animate-fade-up mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg [animation-delay:160ms]">
                Обратный подбор с подтверждёнными достижениями Федерации спортивного программирования.
              </p>
              <div className="animate-fade-up mt-9 flex flex-wrap gap-3 [animation-delay:240ms]">
                <Link href="/register?role=EMPLOYER" className="btn-primary">
                  Найти специалиста
                </Link>
                <Link href="/register?role=CANDIDATE" className="btn border border-white/35 bg-transparent text-white hover:bg-white/10">
                  Создать профиль
                </Link>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6" id="features">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Почему платформа другая</h2>
            <p className="mt-3 text-ink-600">Компетенции, подтверждённые результаты и прозрачное соответствие требованиям.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                title: 'Интеллектуальный подбор',
                text: 'Система сопоставляет требования вакансии и компетенции специалистов.',
              },
              {
                title: 'Подтверждённые достижения',
                text: 'Результаты участника ФСП отображаются непосредственно в профиле.',
              },
              {
                title: 'Обратный подбор',
                text: 'Работодатель сам выбирает подходящих специалистов и отправляет предложение.',
              },
              {
                title: 'IT-профиль',
                text: 'Стек, роль, грейд, опыт, формат и компетенции — в одной карточке специалиста.',
              },
            ].map((item, i) => (
              <article
                key={item.title}
                className="animate-fade-up border-l-2 border-brand-600 pl-5"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <h3 className="font-display text-lg font-bold text-ink-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 md:text-base">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-ink-950/10 bg-ink-950 text-white" id="how">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Как это работает</h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {[
                'Работодатель формирует требования: роль, стек, грейд, опыт, зарплата, формат.',
                'Система рассчитывает соответствие и показывает подходящих специалистов.',
                'Работодатель открывает профиль, видит достижения ФСП и отправляет предложение.',
              ].map((step, idx) => (
                <li key={step} className="relative">
                  <span className="font-display text-5xl font-extrabold text-signal/90">{String(idx + 1).padStart(2, '0')}</span>
                  <p className="mt-4 text-sm leading-relaxed text-white/75 md:text-base">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6" id="about">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">О платформе</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-600">
              FSP IT Career — сервис обратного подбора IT-специалистов. Оценка показывает соответствие требованиям
              вакансии, а не абстрактный рейтинг человека.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Войти
              </Link>
              <Link href="/register" className="btn-secondary">
                Создать профиль
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-950/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-ink-500 md:flex-row md:items-center md:justify-between md:px-6">
          <p>© {new Date().getFullYear()} FSP IT Career</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-ink-800">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="hover:text-ink-800">
              Условия использования
            </Link>
            <Link href="/support" className="hover:text-ink-800">
              Поддержка
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
