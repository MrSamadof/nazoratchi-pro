import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];
const COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME || 'nz_session';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // /api/* — Express ga rewritten bo'ladi, middleware o'tkazib yuboradi
  // Public sahifalar
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/' && pathname !== '/dashboard') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
