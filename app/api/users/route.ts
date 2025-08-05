import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, password, full_name, role_id } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (role_id) updateData.role_id = role_id;
    if (password) {
      updateData.password = password;
      
      // Update auth password first
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: password }
      );
      
      if (authError) {
        console.error('Auth password update error:', authError);
        return NextResponse.json(
          { error: `Failed to update auth password: ${authError.message}` },
          { status: 400 }
        );
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

    // Delete user from auth (this will cascade to profiles)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      role_name: roleData.name,
      hasPassword: !!password
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
        is_active: true,
        password: password // Store password in metadata for profile creation
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

    // Update the profile with the password and correct role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password: password,
        role_id: role_id,
        full_name: full_name
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Don't fail the request if profile update fails, but log it
    }

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