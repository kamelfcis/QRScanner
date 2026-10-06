import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { defaultLocale, hasDailyOps, isEnabledLocale, type Locale } from '@/i18n/config';
import {
  defaultStaffHome,
  isStaffPathAllowed,
  isStaffRole,
  parsePermissionMap,
  type StaffProfile,
} from '@/lib/staff/permissions';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const response = supabaseResponse;
  const { pathname } = request.nextUrl;

  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  let detected: Locale = defaultLocale;
  if (localeCookie && isEnabledLocale(localeCookie)) {
    detected = localeCookie;
  } else {
    detected = defaultLocale;
    response.cookies.set('NEXT_LOCALE', detected, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  response.headers.set('x-locale', detected);

  const isStaffRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/kitchen');

  let profile: StaffProfile | null = null;
  if (hasDailyOps && user) {
    const first = await supabase
      .from('staff_profiles')
      .select('user_id, role, full_name, permissions, is_active')
      .eq('user_id', user.id)
      .maybeSingle();
    const raw =
      first.data ??
      (first.error
        ? (
            await supabase
              .from('staff_profiles')
              .select('user_id, role')
              .eq('user_id', user.id)
              .maybeSingle()
          ).data
        : null);
    const data = raw as {
      user_id: string;
      role: string;
      full_name?: string | null;
      permissions?: unknown;
      is_active?: boolean | null;
    } | null;
    if (data && isStaffRole(data.role) && data.is_active !== false) {
      profile = {
        user_id: data.user_id,
        role: data.role,
        full_name: data.full_name ?? '',
        permissions: parsePermissionMap(data.permissions),
        is_active: true,
      };
    }
  }

  if (isStaffRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (hasDailyOps && !isStaffPathAllowed(profile, pathname)) {
      const home = defaultStaffHome(profile);
      if (pathname !== home) {
        const dest = request.nextUrl.clone();
        dest.pathname = home;
        dest.search = '';
        return NextResponse.redirect(dest);
      }
    }
  }

  if (pathname === '/login' && user) {
    if (hasDailyOps && !profile) {
      return response;
    }
    const redirectTo = request.nextUrl.searchParams.get('redirect') || defaultStaffHome(profile);
    const dashboardUrl = request.nextUrl.clone();
    const safeRedirect =
      redirectTo.startsWith('/dashboard') || redirectTo.startsWith('/kitchen')
        ? redirectTo
        : defaultStaffHome(profile);
    dashboardUrl.pathname = isStaffPathAllowed(profile, safeRedirect)
      ? safeRedirect
      : defaultStaffHome(profile);
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
