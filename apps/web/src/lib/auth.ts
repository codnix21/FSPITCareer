'use client';

export type UserRole = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified?: boolean;
  company?: { id: string; name: string; onboardingCompleted?: boolean } | null;
  candidateProfile?: { id: string; onboardingCompleted?: boolean; profileStatus?: string } | null;
};

const TOKEN_KEY = 'fsp_token';
const USER_KEY = 'fsp_user';

const SESSION_COOKIE = 'fsp_session';

function setSessionCookie(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on) {
    document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setSessionCookie(true);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  setSessionCookie(false);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function dashboardPath(role: UserRole) {
  if (role === 'EMPLOYER') return '/employer/dashboard';
  if (role === 'ADMIN') return '/admin';
  return '/candidate/dashboard';
}

export function onboardingPath(role: UserRole) {
  if (role === 'EMPLOYER') return '/employer/onboarding';
  if (role === 'CANDIDATE') return '/candidate/onboarding';
  return dashboardPath(role);
}

export function roleHomeAllowed(pathname: string, role: UserRole) {
  if (role === 'ADMIN') return pathname.startsWith('/admin');
  if (role === 'EMPLOYER') return pathname.startsWith('/employer');
  if (role === 'CANDIDATE') return pathname.startsWith('/candidate');
  return false;
}
