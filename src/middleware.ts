import { NextResponse, type NextRequest } from 'next/server';

const locales = ['en', 'ar'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Handle locale cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  let detected = 'en';
  if (localeCookie && locales.includes(localeCookie)) {
    detected = localeCookie;
  } else {
    const acceptLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
    detected = acceptLang && locales.includes(acceptLang) ? acceptLang : 'en';
    response.cookies.set('NEXT_LOCALE', detected, { path: '/', maxAge: 365 * 24 * 60 * 60 });
  }
  response.headers.set('x-locale', detected);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|favicon.svg).*)',
  ],
};
