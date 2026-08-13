import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOGIN_LOCALE_COOKIE, detectLocaleFromAcceptLanguage } from '@/lib/login-i18n';

const PUBLIC = ['/login', '/api/health'];

function seedLoginLocaleCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(LOGIN_LOCALE_COOKIE)) return;
  const locale = detectLocaleFromAcceptLanguage(request.headers.get('accept-language'));
  response.cookies.set(LOGIN_LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Health never depends on Supabase session refresh
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) {
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      seedLoginLocaleCookie(request, response);
    }
    return response;
  }

  const hasAuth = request.cookies
    .getAll()
    .some((c) => c.name.includes('auth-token') || c.name.includes('sb-'));

  if (!hasAuth && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
