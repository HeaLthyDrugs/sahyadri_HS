import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured to use cookies
    const { supabase, response } = createClient(request)

    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession()

    // Get the current path
    const path = request.nextUrl.pathname

    // If accessing auth routes while logged in, redirect to dashboard
    if (session && (path.startsWith('/auth') || path === '/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If accessing protected routes without auth, redirect to login
    if (!session && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // For authenticated users accessing dashboard routes, check permissions
    if (session && path.startsWith('/dashboard')) {
      // Get user's role from user_profiles
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role_id')
        .eq('auth_id', session.user.id)
        .single();

      if (userProfile?.role_id) {
        // Get permissions for the user's role
        const { data: permissions } = await supabase
          .from('permissions')
          .select('page_name, can_view, can_edit')
          .eq('role_id', userProfile.role_id);

        // Check if user has permission to access this page
        const hasPermission = permissions?.some(permission => 
          path.startsWith(permission.page_name) && permission.can_view
        );

        if (!hasPermission) {
          // Redirect to dashboard if no permission
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }

    return response
  } catch (e) {
    // If there's an error, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}