import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        roles!inner (
          name
        )
      `)
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 });
    }

    if (!profile?.roles?.name || !['Admin', 'Owner'].includes(profile.roles.name)) {
      // Try to initialize admin if this is the first user
      const { error: initError } = await supabase.rpc('init_admin');
      if (initError) {
        console.error('Failed to initialize admin:', initError);
        return NextResponse.json({ error: 'Forbidden - Admin or Owner access required' }, { status: 403 });
      }

      // Check role again after initialization
      const { data: updatedProfile, error: checkError } = await supabase
        .from('profiles')
        .select(`
          *,
          roles!inner (
            name
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (checkError || !updatedProfile?.roles?.name || !['Admin', 'Owner'].includes(updatedProfile.roles.name)) {
        return NextResponse.json({ error: 'Forbidden - Admin or Owner access required' }, { status: 403 });
      }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Service role key is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create admin client directly
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error: usersError } = await adminClient.auth.admin.listUsers();

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users list' }, { status: 500 });
    }

    return NextResponse.json({ users: data.users });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 