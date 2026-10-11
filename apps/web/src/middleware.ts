import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** UX gate only — API JWT/RBAC remains the security boundary. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPrefixes = ['/candidate', '/employer', '/admin', '/settings'];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get('fsp_session')?.value;
  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/candidate/:path*', '/employer/:path*', '/admin/:path*', '/settings/:path*'],
};
