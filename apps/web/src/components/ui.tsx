'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { clearAuth, dashboardPath, getStoredUser, type AuthUser } from '@/lib/auth';
import { fspStatusLabel, ROLE_LABEL } from '@/lib/labels';
import type { NavItem } from '@/lib/nav';
import {
  checklistFromBreakdown,
  MATCH_BREAKDOWN_LABELS,
  normalizeBreakdown,
  pct,
  type MatchBreakdown,
} from '@/lib/matching-ui';
import clsx from 'clsx';

function routeActive(pathname: string, search: string, href: string) {
  const [path, hash] = href.split('#');
  const [pathOnly, query] = path.split('?');
  if (pathname !== pathOnly) {
    return !query && pathOnly !== '/' && pathname.startsWith(`${pathOnly}/`);
  }
  if (!query) {
    return !search || !!hash;
  }
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search);
  return [...want.entries()].every(([k, v]) => have.get(k) === v);
}

export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser());
    setOpen(false);
  }, [pathname]);

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push('/');
  };

  const links = [
    { href: '/#how', label: 'Как это работает' },
    { href: '/#fsp', label: 'Достижения ФСП' },
    { href: '/vacancies', label: 'Вакансии' },
    { href: '/specialists', label: 'Специалисты' },
  ];

  const cabinet =
    user?.role === 'EMPLOYER'
      ? '/employer/dashboard'
      : user?.role === 'ADMIN'
        ? '/admin'
        : '/candidate/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-950/8 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink-950">
          FSP IT Career
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Основная навигация">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-600 transition hover:text-brand-800">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={cabinet} className="btn-primary !px-3 !py-2 text-sm sm:!px-5">
                Кабинет
              </Link>
              <button type="button" onClick={logout} className="btn-ghost hidden sm:inline-flex !px-3 !py-2">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-primary !px-3 !py-2 text-sm sm:!px-5">
                Войти
              </Link>
              <Link href="/register" className="btn-secondary hidden sm:inline-flex !px-3 !py-2">
                Регистрация
              </Link>
            </>
          )}
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          >
            {open ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-950/10 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-ink-50">
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link href="/register" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-ink-50">
                Регистрация
              </Link>
            )}
            {user && (
              <button type="button" onClick={logout} className="rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-ink-50">
                Выйти
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function AppShell({
  title,
  nav,
  children,
  actions,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="skeleton h-8 w-40" />
        </div>
      }
    >
      <AppShellInner title={title} nav={nav} actions={actions}>
        {children}
      </AppShellInner>
    </Suspense>
  );
}

function AppShellInner({
  title,
  nav,
  children,
  actions,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace('/login');
      return;
    }

    const onOnboarding = pathname.includes('/onboarding');
    const isShared = pathname.startsWith('/settings') || pathname.startsWith('/support');
    if (!isShared && pathname.startsWith('/admin') && u.role !== 'ADMIN') {
      router.replace(dashboardPath(u.role));
      return;
    }
    if (!isShared && pathname.startsWith('/employer') && u.role !== 'EMPLOYER' && u.role !== 'ADMIN') {
      router.replace(dashboardPath(u.role));
      return;
    }
    if (!isShared && pathname.startsWith('/candidate') && u.role !== 'CANDIDATE' && u.role !== 'ADMIN') {
      router.replace(dashboardPath(u.role));
      return;
    }

    setUser(u);

    (async () => {
      try {
        const { api } = await import('@/lib/api');
        if (u.role === 'CANDIDATE' && !onOnboarding) {
          const profile = await api('/candidates/me');
          if (!profile.onboardingCompleted) {
            router.replace('/candidate/onboarding');
            return;
          }
        }
        if (u.role === 'EMPLOYER' && !onOnboarding) {
          const company = await api('/companies/me');
          if (!company.onboardingCompleted) {
            router.replace('/employer/onboarding');
            return;
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [router, pathname]);

  const logout = () => {
    clearAuth();
    router.push('/');
  };

  const mobileNav = useMemo(() => {
    const marked = nav.filter((n) => n.mobile);
    return (marked.length ? marked : nav).slice(0, 4);
  }, [nav]);

  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of nav) {
      const g = item.group || '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return [...map.entries()];
  }, [nav]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-8 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-950/8 bg-ink-950 text-white lg:flex">
        <div className="border-b border-white/10 px-4 py-4">
          <Link href="/" className="font-display text-base font-bold tracking-tight text-white">
            FSP IT Career
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Кабинет">
          {grouped.map(([group, items]) => (
            <div key={group || 'main'} className="mb-3">
              {group ? <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">{group}</p> : null}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'block rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400',
                        routeActive(pathname, search, item.href)
                          ? 'bg-white/12 font-semibold text-white'
                          : 'font-medium text-white/65 hover:bg-white/8 hover:text-white',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-3">
          <p className="truncate text-sm font-medium text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-white/45">{ROLE_LABEL[user.role] || user.role}</p>
          <button type="button" onClick={logout} className="mt-2 text-xs font-medium text-white/50 hover:text-white">
            Выйти
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-ink-950/8 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="min-w-0">
              <Link href="/" className="font-display text-sm font-extrabold text-ink-950 lg:hidden">
                FSP IT Career
              </Link>
              <h1 className="page-title truncate text-ink-950">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <button type="button" onClick={logout} className="btn-ghost !px-3 !py-2 lg:hidden" aria-label="Выйти">
                Выйти
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-content px-4 py-5 pb-32 md:px-6 md:py-6 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-950/8 bg-white/95 backdrop-blur-md lg:hidden" aria-label="Мобильная навигация">
        <div className="mx-auto grid max-w-content grid-cols-4 gap-1 px-2 py-2">
          {mobileNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex min-h-[52px] flex-col items-center justify-center rounded-[10px] px-1 text-center text-[11px] font-semibold leading-tight',
                routeActive(pathname, search, item.href) ? 'bg-brand-50 text-brand-800' : 'text-ink-500',
              )}
            >
              {item.short || item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 h-0.5 w-10 bg-brand-700" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Загрузка' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-ink-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      {label}…
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && <p className="mb-1 text-sm text-ink-600">{label}</p>}
      <div className="h-1.5 overflow-hidden rounded-sm bg-ink-100" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-red-200 bg-red-50 text-red-800" role="alert">
      <p className="font-semibold">Ошибка</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-3" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function MatchBadge({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  const color =
    score >= 85 ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : score >= 70 ? 'bg-signal-soft text-signal-deep' : 'bg-ink-100 text-ink-700';
  if (size === 'lg') {
    return (
      <div className={clsx('inline-flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl px-3 py-2.5 text-center', color)}>
        <span className="font-display text-2xl font-extrabold tabular-nums leading-none md:text-3xl">{Math.round(score * 10) / 10}%</span>
        <span className="mt-1 text-[10px] font-medium leading-tight text-current/80">соответствие<br />требованиям</span>
      </div>
    );
  }
  return <span className={clsx('badge', color)}>{Math.round(score * 10) / 10}% соответствия</span>;
}

export function MatchExplain({
  score,
  breakdown,
  reasons,
  compact = false,
}: {
  score: number;
  breakdown?: Partial<MatchBreakdown> | null;
  reasons?: string[];
  compact?: boolean;
}) {
  const b = normalizeBreakdown(breakdown);
  const checks = b ? checklistFromBreakdown(b) : [];

  return (
    <div className={clsx(!compact && 'card', compact && 'rounded-xl border border-ink-950/8 bg-ink-50/60 p-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title text-ink-950">Соответствие вакансии</h3>
          <p className="mt-1 text-xs text-ink-500">Соответствие требованиям вакансии — не оценка человека</p>
        </div>
        <MatchBadge score={score} size="lg" />
      </div>

      {b && (
        <div className="mt-5 space-y-2.5">
          {MATCH_BREAKDOWN_LABELS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-2 text-sm sm:grid-cols-[7.5rem_1fr_2.75rem]">
              <span className="text-ink-600">{label}</span>
              <div className="h-2 overflow-hidden rounded-sm bg-ink-100">
                <div className="h-full rounded-sm bg-brand-600" style={{ width: `${pct(b[key])}%` }} />
              </div>
              <span className="text-right text-xs font-semibold tabular-nums text-ink-700">{pct(b[key])}%</span>
            </div>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {checks.map((c) => (
            <li key={c.text} className={c.ok ? 'text-ink-700' : 'text-ink-400'}>
              {c.ok ? '✓' : '○'} {c.text}
            </li>
          ))}
        </ul>
      )}

      {reasons && reasons.length > 0 && (
        <div className="mt-4 border-t border-ink-950/8 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Основные совпадения</p>
          <ul className="space-y-1 text-sm text-ink-700">
            {reasons.slice(0, 6).map((r) => (
              <li key={r}>✓ {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function InitialsAvatar({
  firstName,
  lastName,
  size = 'md',
}: {
  firstName?: string;
  lastName?: string;
  size?: 'md' | 'lg';
}) {
  const initials = `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || '?';
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-xl bg-brand-50 font-display font-bold text-brand-800 ring-1 ring-brand-100',
        size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base',
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function SkillBars({ skills }: { skills: { name: string; level: number }[] }) {
  return (
    <div className="space-y-3">
      {skills.map((s) => (
        <div key={s.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-800">{s.name}</span>
            <span className="text-xs text-ink-400">{s.level}/5</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-ink-100" aria-hidden>
            <div className="h-full rounded-sm bg-brand-600" style={{ width: `${Math.min(100, (s.level / 5) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkillChips({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <span key={s} className="badge bg-ink-50 text-ink-700 ring-1 ring-ink-950/8">
          {s}
        </span>
      ))}
    </div>
  );
}

export function ExpandableSkillChips({
  skills,
  limit = 5,
}: {
  skills: { name: string; level?: number }[];
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? skills : skills.slice(0, limit);
  const rest = skills.length - limit;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s) => (
          <span key={s.name} className="badge bg-ink-50 text-ink-800 ring-1 ring-ink-950/8">
            {s.name}
            {s.level != null ? ` · ${s.level}/5` : ''}
          </span>
        ))}
      </div>
      {rest > 0 && (
        <button type="button" className="mt-2 text-sm font-medium text-brand-700 hover:text-brand-800" onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : `Показать ещё ${rest}`}
        </button>
      )}
    </div>
  );
}

export function FspAchievements({
  achievements,
}: {
  achievements: { id: string; title: string; discipline: string; place?: number | null; year: number; status?: string; isDemo?: boolean }[];
}) {
  const anyDemo = achievements.some((a) => a.isDemo !== false);

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="section-title text-ink-950">Достижения ФСП</h3>
          <p className="mt-1 text-sm text-ink-600">
            {anyDemo ? 'Демонстрационные данные ФСП' : 'Данные Федерации спортивного программирования'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-500">{achievements.length} {achievements.length === 1 ? 'достижение' : achievements.length < 5 ? 'достижения' : 'достижений'}</span>
          {anyDemo && <span className="badge bg-ink-100 text-ink-600">ДЕМО</span>}
        </div>
      </div>
      {achievements.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">Достижений пока нет</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <article key={a.id} className="border border-ink-950/8 bg-ink-50/40 p-4">
              <p className="font-medium text-ink-900">{a.title}</p>
              <p className="mt-2 text-sm text-ink-600">{a.discipline}</p>
              <p className="mt-1 text-sm text-ink-600">
                {a.place != null ? `${a.place} место · ` : ''}
                {a.year}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.isDemo !== false ? (
                  <span className="badge bg-white text-ink-600 ring-1 ring-ink-950/10">ДЕМО</span>
                ) : (
                  <span className="badge bg-brand-50 text-brand-800 ring-1 ring-brand-200">Подтверждено</span>
                )}
                <span className="badge bg-ink-100 text-ink-700">{fspStatusLabel(a.status)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-ink-950/50" onClick={onClose} aria-label="Закрыть" />
      <div
        className={clsx(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto animate-fade-up rounded-xl border border-ink-950/8 bg-white p-6 shadow-panel',
          size === 'lg' ? 'max-w-2xl' : 'max-w-[34rem]',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="section-title text-ink-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button type="button" className="btn-ghost !min-h-10 !px-3" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-ink-950/55" onClick={onClose} aria-label="Закрыть" />
      <div className="relative z-10 w-full max-w-md animate-fade-up rounded-xl border border-ink-950/10 bg-white p-5">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? 'Выполняется…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
