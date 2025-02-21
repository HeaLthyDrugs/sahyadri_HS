import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface DatabaseRole {
  id: string;
}

interface DatabaseUserRole {
  roles: DatabaseRole[];
}

interface Permission {
  page_name: string;
  can_view: boolean;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // Handle authentication routes
  if (pathname.startsWith('/auth')) {
    // If user is logged in and trying to access auth pages, redirect to dashboard
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Allow access to auth pages for non-authenticated users
    return response
  }

  // Handle root route
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Handle dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    try {
      // Get user's role and permissions
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          role_id,
          roles:role_id (
            id
          )
        `)
        .eq('id', user.id)
        .single()

      if (profileError || !profileData?.role_id) {
        console.error('Profile error:', profileError || 'No role_id found')
        // Allow access but with no permissions
        return response
      }

      const { data: permissions, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', profileData.role_id)

      if (permissionsError) {
        console.error('Permissions error:', permissionsError)
        // Allow access but with no permissions
        return response
      }

      // Check if user has full access
      const hasFullAccess = permissions?.some(p => p.page_name === '*' && p.can_view)
      
      if (!hasFullAccess) {
        // Check specific page permission
        const hasPermission = permissions?.some(p => 
          p.page_name === pathname && p.can_view
        )

        if (!hasPermission) {
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-user-permissions', JSON.stringify(permissions || []))
          
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          
          return response
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      // Allow access but with no permissions on error
      return response
    }
  }

  // Allow access to public routes (api, static files, etc.)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}