import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create default roles
    const roles = [
      { name: 'Owner', description: 'System owner with full access' },
      { name: 'Admin', description: 'Administrator with full access' },
      { name: 'Manager', description: 'Manager with limited access' },
      { name: 'User', description: 'Basic user with minimal access' },
      { name: 'Viewer', description: 'Read-only access' }
    ];

    const createdRoles: any = {};

    for (const role of roles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating role ${role.name}:`, error);
      } else {
        createdRoles[role.name] = data;
      }
    }

    // Clear existing permissions
    await supabase.from('permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create permissions
    const permissions = [
      // Owner gets full access
      { role_id: createdRoles.Owner?.id, page_name: '*', can_view: true, can_edit: true },
      
      // Admin gets full access
      { role_id: createdRoles.Admin?.id, page_name: '*', can_view: true, can_edit: true },
      
      // Manager permissions
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/users', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/users/manage', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/inventory', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/inventory/packages', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/inventory/products', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/consumer', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/consumer/programs', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/consumer/participants', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/consumer/staff', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/billing', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/billing/entries', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/billing/invoice', can_view: true, can_edit: true },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/billing/reports', can_view: true, can_edit: false },
      { role_id: createdRoles.Manager?.id, page_name: '/dashboard/profile', can_view: true, can_edit: true },
      
      // User permissions
      { role_id: createdRoles.User?.id, page_name: '/dashboard', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/consumer', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/consumer/programs', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/consumer/participants', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/billing', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/billing/entries', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/billing/reports', can_view: true, can_edit: false },
      { role_id: createdRoles.User?.id, page_name: '/dashboard/profile', can_view: true, can_edit: true },
      
      // Viewer permissions
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/consumer', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/consumer/programs', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/consumer/participants', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/billing', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/billing/entries', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/billing/reports', can_view: true, can_edit: false },
      { role_id: createdRoles.Viewer?.id, page_name: '/dashboard/profile', can_view: true, can_edit: false }
    ];

    // Insert permissions
    const validPermissions = permissions.filter(p => p.role_id);
    if (validPermissions.length > 0) {
      const { error: permError } = await supabase
        .from('permissions')
        .insert(validPermissions);
      
      if (permError) {
        console.error('Error creating permissions:', permError);
        return NextResponse.json({ error: 'Failed to create permissions', details: permError }, { status: 500 });
      }
    }

    // Check if current user has a profile, if not create one as Owner
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create one as Owner
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role_id: createdRoles.Owner?.id,
          is_active: true
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
      }
    } else if (!profile?.role_id && createdRoles.Owner?.id) {
      // Profile exists but no role, update to Owner
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ role_id: createdRoles.Owner.id })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permission system initialized successfully',
      roles: createdRoles,
      permissionsCreated: validPermissions.length
    });

  } catch (error) {
    console.error('Init permissions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}