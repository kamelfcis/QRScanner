import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { defaultLocale, locales, type Locale } from '@/i18n/config';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const response = supabaseResponse;
  const { pathname } = request.nextUrl;

  // Locale detection / persistence
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  let detected: Locale = defaultLocale;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    detected = localeCookie as Locale;
  } else {
    const acceptLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
    detected =
      acceptLang && locales.includes(acceptLang as Locale) ? (acceptLang as Locale) : defaultLocale;
    response.cookies.set('NEXT_LOCALE', detected, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  response.headers.set('x-locale', detected);

  // Protect dashboard routes — require authenticated session
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = redirectTo.startsWith('/dashboard') ? redirectTo : '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|icon.svg|favicon.svg|icon|apple-icon).*)',
  ],
};
