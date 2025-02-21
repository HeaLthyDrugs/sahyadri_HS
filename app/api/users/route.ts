import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role_id } = body;

    if (!email || !password || !full_name || !role_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create Supabase admin client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, verify that the role exists and get its name
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', role_id)
      .single();

    if (roleError || !roleData) {
      console.error('Role verification error:', roleError);
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    console.log('Creating user with data:', { 
      email, 
      full_name, 
      role_id,
      role_name: roleData.name 
    });

    // Create user in Auth with role information in metadata
    // The trigger will handle profile creation
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role_id,
        role: roleData.name,
        is_active: true
      }
    });

    if (authError) {
      console.error('Detailed Auth Error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        stack: authError.stack
      });
      return NextResponse.json(
        { 
          error: authError.message,
          details: {
            status: authError.status,
            name: authError.name
          }
        },
        { status: authError.status || 400 }
      );
    }

    if (!authData?.user) {
      console.error('No user data returned from auth creation');
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 400 }
      );
    }

    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, roles!inner(*)')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile verification error:', profileError);
      // Clean up the auth user if profile wasn't created
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to verify user profile creation' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: {
        ...authData.user,
        profile
      }
    });

  } catch (error) {
    console.error('Detailed error creating user:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 