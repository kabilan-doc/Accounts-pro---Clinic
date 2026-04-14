import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-compatible token parser (no Node.js crypto needed here).
// Full HMAC verification still happens inside every API route.
function parseSessionCookie(token: string): { id: string; role: string } | null {
  try {
    // token is base64( jsonBody + '.' + hmacHex )
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return null;
    const body = decoded.substring(0, lastDot);
    const parsed = JSON.parse(body);
    if (!parsed.id || !parsed.role) return null;
    return parsed as { id: string; role: string };
  } catch {
    return null;
  }
}

const PUBLIC = ['/login', '/api/auth/pin-login', '/api/profiles'];
const ADMIN_ONLY = ['/audit', '/admin', '/api/audit', '/api/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const raw   = request.cookies.get('clinic_session')?.value ?? '';
  const session = raw ? parseSessionCookie(raw) : null;

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin-only guard
  if (ADMIN_ONLY.some(p => pathname.startsWith(p)) && session.role !== 'admin') {
    return pathname.startsWith('/api')
      ? new NextResponse('Forbidden', { status: 403 })
      : NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard', '/entry', '/history', '/analytics', '/historical', '/accounts',
    '/audit', '/admin',
    '/api/dashboard/:path*',
    '/api/entries/:path*',
    '/api/accounts/:path*',
    '/api/audit/:path*',
    '/api/admin/:path*',
    '/api/export/:path*',
    '/api/cron/:path*'
  ]
};
