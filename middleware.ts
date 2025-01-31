import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const path = request.nextUrl.pathname;

  console.log("Middleware processing path:", path);

  // Check both Supabase session and local auth
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

  console.log("Auth state - Supabase session:", !!session);
  console.log("Auth state - Cookie:", isAuthenticated);

  // Protected routes check
  if (path.startsWith('/dashboard')) {
    console.log("Checking dashboard access...");
    if (!session && !isAuthenticated) {
      console.log("Access denied, redirecting to login");
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    console.log("Dashboard access granted");
    return res;
  }

  // Auth routes check
  if (path.startsWith('/auth')) {
    console.log("Processing auth route...");
    // Allow direct access to login/signin pages when not authenticated
    if (path === '/auth/login' || path === '/auth/signin') {
      if (session || isAuthenticated) {
        console.log("User already authenticated, redirecting to dashboard");
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      console.log("Allowing access to login page");
      return res;
    }

    // Redirect base /auth to login
    if (path === '/auth') {
      console.log("Redirecting /auth to /auth/login");
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  console.log("Middleware complete, proceeding with request");
  return res;
}

export const config = {
  matcher: ['/auth/:path*', '/dashboard/:path*'],
}; 