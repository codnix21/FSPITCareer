const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fsp_token');
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fsp_token');
  localStorage.removeItem('fsp_user');
  const path = window.location.pathname;
  if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/forgot-password')) {
    window.location.href = `/login?next=${encodeURIComponent(path)}`;
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && options.auth !== false) {
      handleUnauthorized();
    }
    const msg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || data.error || 'Произошла ошибка';
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export { API_URL };
