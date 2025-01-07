import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // If it's the admin path and user is not authenticated
  if (path.startsWith('/admin') && path !== '/admin/login') {
    // Check authentication from cookies
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
}; 