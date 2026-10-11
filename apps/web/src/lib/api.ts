const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
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
    const raw = data.message;
    const msg = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'object' && raw?.message
        ? raw.message
        : raw || data.error || 'Произошла ошибка';
    const err = new ApiError(humanizeApiMessage(String(msg)), res.status, typeof raw === 'object' ? raw : data);
    throw err;
  }
  return data as T;
}

/** Hide Prisma / stack internals from end users; keep intentional Russian API messages. */
export function humanizeApiMessage(message: string) {
  const m = message || 'Произошла ошибка';
  if (/P\d{4}|PrismaClient|prisma\.|ECONNREFUSED|Cannot read propert/i.test(m)) {
    return 'Не удалось выполнить действие. Попробуйте ещё раз';
  }
  if (/Internal Server Error/i.test(m)) {
    return 'Внутренняя ошибка сервера';
  }
  return m;
}

export { API_URL };
