import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role_id,
        is_active,
        roles:role_id (
          id,
          name,
          description
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile error', 
        details: profileError,
        user_id: user.id 
      }, { status: 500 });
    }

    // Get all roles
    const { data: allRoles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    // Get permissions for user's role
    let permissions = [];
    if (profile?.role_id) {
      const { data: userPermissions, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', profile.role_id)
        .order('page_name');

      if (!permissionsError) {
        permissions = userPermissions || [];
      }
    }

    // Get all permissions in the system
    const { data: allPermissions, error: allPermissionsError } = await supabase
      .from('permissions')
      .select(`
        *,
        roles:role_id (
          name
        )
      `)
      .order('page_name');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile,
      permissions,
      allRoles: allRoles || [],
      allPermissions: allPermissions || [],
      debug: {
        hasProfile: !!profile,
        hasRole: !!profile?.role_id,
        permissionsCount: permissions.length,
        totalRoles: allRoles?.length || 0,
        totalPermissions: allPermissions?.length || 0
      }
    });

  } catch (error) {
    console.error('Debug permissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}