import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from '@/i18n/config';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Handle locale cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  let detected = 'en';
  if (localeCookie && locales.includes(localeCookie as typeof locales[number])) {
    detected = localeCookie;
  } else {
    const acceptLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
    detected = acceptLang && locales.includes(acceptLang as typeof locales[number])
      ? acceptLang
      : 'en';
    response.cookies.set('NEXT_LOCALE', detected, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  response.headers.set('x-locale', detected);

  let user = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
  } catch (err) {
    console.warn('Middleware auth error:', err);
  }

  const pathname = request.nextUrl.pathname;

  // Protected dashboard routes
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Auth routes - redirect to dashboard if already logged in
  const isAuthRoute = pathname === '/login';

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|favicon.svg).*)',
  ],
};
