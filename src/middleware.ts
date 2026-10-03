import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import {
  getMenuEntryPath,
  isRestaurantOnlyDashboardPath,
  isEcommerceStore,
  skipWelcomePage,
} from '@/lib/store-config';
import { LINK_PAGE_DASHBOARD_PATH, showLinkPage } from '@/lib/tenant-config';

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
    // First visit: use default locale (en for Mazen Store); user can switch via toggle
    detected = defaultLocale;
    response.cookies.set('NEXT_LOCALE', detected, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  response.headers.set('x-locale', detected);

  const isStaffRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/kitchen');

  // Protect staff routes — require authenticated session
  if (isStaffRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      isEcommerceStore &&
      (pathname.startsWith('/kitchen') || isRestaurantOnlyDashboardPath(pathname))
    ) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }

    if (
      !showLinkPage &&
      (pathname === LINK_PAGE_DASHBOARD_PATH || pathname.startsWith(`${LINK_PAGE_DASHBOARD_PATH}/`))
    ) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // E-commerce / configured QR target: skip welcome mode picker
  if (skipWelcomePage && pathname === '/welcome') {
    const menuUrl = request.nextUrl.clone();
    menuUrl.pathname = getMenuEntryPath();
    menuUrl.searchParams.delete('skip');
    return NextResponse.redirect(menuUrl);
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname =
      redirectTo.startsWith('/dashboard') || redirectTo.startsWith('/kitchen')
        ? redirectTo
        : '/dashboard';
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
