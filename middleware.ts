import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // If user is not logged in and trying to access protected route
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in
  if (session) {
    // Get user's profile with role and modules
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        *,
        roles (
          name,
          role_modules (
            modules (
              path
            )
          )
        )
      `)
      .eq('id', session.user.id)
      .single();

    // If no profile or role found, redirect to login
    if (!profile?.roles) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/auth/login';
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user has access to the current path
    const currentPath = req.nextUrl.pathname;
    const allowedPaths = profile.roles.role_modules
      .map((rm: any) => rm.modules.path)
      .filter(Boolean);

    // Always allow access to dashboard home
    allowedPaths.push('/dashboard');

    // If trying to access unauthorized path
    if (!allowedPaths.some((path: string) => currentPath.startsWith(path))) {
      // Redirect to dashboard if unauthorized
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
  ],
}; 