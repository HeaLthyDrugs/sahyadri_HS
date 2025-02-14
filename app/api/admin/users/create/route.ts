import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check if user is admin or owner
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
      return NextResponse.json({ error: 'Forbidden - Admin or Owner access required' }, { status: 403 });
    }

    // Get request body
    const { email, password, full_name, role_id, is_active } = await request.json();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Service role key is missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create admin client
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

    // Create user with admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (newUser.user) {
      // Update the profile with additional information
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name,
          role_id,
          is_active,
        })
        .eq('id', newUser.user.id);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
        // Try to delete the created user if profile update fails
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 