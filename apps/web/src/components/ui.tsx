'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { clearAuth, dashboardPath, getStoredUser, type AuthUser } from '@/lib/auth';
import clsx from 'clsx';

function routeActive(pathname: string, search: string, href: string) {
  const [path, query] = href.split('?');
  if (pathname !== path) {
    return !query && path !== '/' && pathname.startsWith(`${path}/`);
  }
  if (!query) {
    return !search;
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
    { href: '/vacancies', label: 'Вакансии' },
    { href: '/specialists', label: 'Специалисты' },
    { href: '/#how', label: 'Как это работает' },
  ];

  const cabinet =
    user?.role === 'EMPLOYER'
      ? '/employer/dashboard'
      : user?.role === 'ADMIN'
        ? '/admin'
        : '/candidate/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-950/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink-950">
          FSP IT Career
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-600 hover:text-brand-700">
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
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          >
            {open ? 'Закрыть' : 'Ещё'}
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
            <Link href="/#about" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-ink-50">
              О платформе
            </Link>
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
  nav: { href: string; label: string; short?: string }[];
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
  nav: { href: string; label: string; short?: string }[];
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
    const isShared = pathname.startsWith('/settings');
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

  const primaryNav = nav.filter((n) => !n.href.includes('/settings') && !n.href.includes('/company') && !n.href.includes('/onboarding'));
  const secondaryNav = nav.filter((n) => n.href.includes('/settings') || n.href.includes('/company'));

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-8 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-6">
      <header className="sticky top-0 z-30 border-b border-ink-950/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <Link href="/" className="font-display text-sm font-extrabold text-ink-950">
              FSP IT Career
            </Link>
            <h1 className="truncate font-display text-lg font-bold leading-tight text-ink-950 md:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink-900">
                {user.firstName} {user.lastName}
              </p>
              <button type="button" onClick={logout} className="text-xs font-medium text-ink-500 hover:text-signal">
                Выйти
              </button>
            </div>
            <button type="button" onClick={logout} className="btn-ghost !px-3 !py-2 sm:hidden" aria-label="Выйти">
              Выйти
            </button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:px-6 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition',
                routeActive(pathname, search, item.href) ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100',
              )}
            >
              {item.short || item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-950/10 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 py-2">
          {primaryNav.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex min-h-[52px] flex-col items-center justify-center rounded-md px-1 text-center text-[11px] font-semibold leading-tight',
                routeActive(pathname, search, item.href) ? 'bg-brand-50 text-brand-800' : 'text-ink-500',
              )}
            >
              {item.short || item.label}
            </Link>
          ))}
        </div>
        {secondaryNav.length > 0 && (
          <div className="flex justify-center gap-4 border-t border-ink-950/5 px-3 py-1.5 text-[11px]">
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('font-medium', routeActive(pathname, search, item.href) ? 'text-brand-700' : 'text-ink-400')}
              >
                {item.short || item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 h-1 w-10 bg-signal" />
      <h3 className="font-display text-lg font-bold">{title}</h3>
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
      <div className="h-1.5 overflow-hidden rounded-sm bg-ink-100">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-red-200 bg-red-50 text-red-800">
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

export function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : score >= 70 ? 'bg-signal-soft text-signal-deep' : 'bg-ink-100 text-ink-700';
  return <span className={clsx('badge', color)}>{Math.round(score)}% соответствия</span>;
}

export function SkillChips({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <span key={s} className="badge bg-ink-50 text-ink-700 ring-1 ring-ink-950/10">
          {s}
        </span>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink-950/55" onClick={onClose} aria-label="Закрыть" />
      <div
        className={clsx(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto animate-fade-up rounded-xl border border-ink-950/10 bg-white p-5',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{title}</h2>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
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
