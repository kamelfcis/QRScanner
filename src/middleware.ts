import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC = ['/login', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) return response;

  // Soft gate: cookie presence. Hard check happens in layouts / API.
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
