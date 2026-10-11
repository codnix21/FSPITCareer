import Link from 'next/link';
import { SiteHeader } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-ink-950/8">
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage: `
                linear-gradient(105deg, rgba(245,247,248,0.97) 0%, rgba(245,247,248,0.88) 42%, rgba(13,110,106,0.12) 100%),
                url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230c1219' stroke-opacity='0.045' stroke-width='1'%3E%3Cpath d='M0 32h64M32 0v64'/%3E%3C/g%3E%3C/svg%3E")
              `,
              backgroundSize: 'cover, 48px 48px',
            }}
          />
          <div className="relative mx-auto max-w-content px-4 py-20 md:px-6 md:py-28">
            <p className="animate-fade-up font-display text-4xl font-extrabold tracking-tight text-ink-950 md:text-5xl">
              FSP IT Career
            </p>
            <div className="mt-3 h-0.5 w-16 origin-left animate-slide-line bg-brand-700" />
            <h1
              className="mt-7 max-w-2xl animate-fade-up font-display text-[clamp(1.65rem,3.6vw,2.45rem)] font-semibold leading-[1.18] tracking-tight text-ink-950"
              style={{ animationDelay: '80ms' }}
            >
              Подбор IT-специалистов с измеримым соответствием требованиям
            </h1>
            <p
              className="mt-5 max-w-lg animate-fade-up text-base leading-relaxed text-ink-600 md:text-lg"
              style={{ animationDelay: '140ms' }}
            >
              Опишите задачу — система ранжирует кандидатов и объясняет совпадения по навыкам, опыту и формату работы.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <Link href="/register?role=EMPLOYER" className="btn-primary !px-7 !py-3">
                Найти специалиста
              </Link>
              <Link href="/register?role=CANDIDATE" className="btn-secondary !px-7 !py-3">
                Я ищу работу
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-content px-4 py-16 md:px-6" id="how">
          <h2 className="page-title text-ink-950">Как это работает</h2>
          <ol className="mt-10 max-w-xl space-y-0">
            {[
              'Работодатель формирует требования',
              'Система анализирует специалистов',
              'Показывает соответствие',
              'Показывает достижения ФСП',
              'Работодатель отправляет предложение',
            ].map((step, idx) => (
              <li key={step} className="relative border-l border-ink-200 pb-8 pl-6 last:pb-0">
                <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center bg-brand-700 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <p className="pt-0.5 text-base font-medium text-ink-900">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-ink-950/8 bg-white" id="fsp">
          <div className="mx-auto grid max-w-content gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-6">
            <div>
              <h2 className="page-title text-ink-950">Почему ФСП?</h2>
              <p className="mt-4 max-w-md leading-relaxed text-ink-600">
                Практические достижения соревновательного программирования становятся частью профессионального профиля.
              </p>
              <p className="mt-3 max-w-md text-sm text-ink-500">
                Это дополнительный сигнал опыта — не автоматическое доказательство профессиональной пригодности.
              </p>
            </div>
            <article className="border border-ink-950/10 bg-ink-50/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">Пример</p>
              <p className="mt-3 font-display text-lg font-semibold text-ink-950">
                Чемпионат России по спортивному программированию
              </p>
              <p className="mt-2 text-sm text-ink-600">Программирование · 12 место · 2026</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge bg-white text-ink-600 ring-1 ring-ink-950/10">ДЕМО</span>
                <span className="badge bg-brand-50 text-brand-800 ring-1 ring-brand-200">Финалист</span>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-content px-4 py-16 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="border-t-2 border-brand-700 pt-6">
              <h3 className="section-title">Работодателю</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Опишите, кого ищете → получите список с объяснением соответствия → откройте профиль → отправьте предложение.
              </p>
              <Link href="/register?role=EMPLOYER" className="btn-primary mt-5">
                Найти специалиста
              </Link>
            </div>
            <div className="border-t-2 border-ink-950/15 pt-6">
              <h3 className="section-title">Соискателю</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Соберите IT-профиль, навыки и достижения ФСП → получайте релевантные вакансии и предложения.
              </p>
              <Link href="/register?role=CANDIDATE" className="btn-secondary mt-5">
                Создать профиль
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-ink-950/8 bg-white">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-ink-500 md:px-6">
            <p>© {new Date().getFullYear()} FSP IT Career</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-ink-800">
                Конфиденциальность
              </Link>
              <Link href="/terms" className="hover:text-ink-800">
                Условия
              </Link>
              <Link href="/support" className="hover:text-ink-800">
                Поддержка
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
