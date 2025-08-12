#!/usr/bin/env node

/**
 * Permission System Fix Script
 * Run this script to initialize the permission system
 * Usage: node scripts/fix-permissions.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializePermissionSystem() {
  try {
    console.log('🚀 Initializing permission system...');

    // Create default roles
    const roles = [
      { name: 'Owner', description: 'System owner with full access' },
      { name: 'Admin', description: 'Administrator with full access' },
      { name: 'Manager', description: 'Manager with limited access' },
      { name: 'User', description: 'Basic user with minimal access' },
      { name: 'Viewer', description: 'Read-only access' }
    ];

    const createdRoles = {};

    console.log('📝 Creating roles...');
    for (const role of roles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creating role ${role.name}:`, error);
      } else {
        createdRoles[role.name] = data;
        console.log(`✅ Created/updated role: ${role.name}`);
      }
    }

    // Clear existing permissions
    console.log('🧹 Clearing existing permissions...');
    const { error: clearError } = await supabase
      .from('permissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('❌ Error clearing permissions:', clearError);
    } else {
      console.log('✅ Cleared existing permissions');
    }

    // Create permissions
    console.log('🔐 Creating permissions...');
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
        console.error('❌ Error creating permissions:', permError);
      } else {
        console.log(`✅ Created ${validPermissions.length} permissions`);
      }
    }

    // Get first user and make them Owner if no owner exists
    console.log('👤 Setting up first user as Owner...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else if (users.users.length > 0) {
      const firstUser = users.users[0];
      
      // Check if user already has a profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firstUser.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one as Owner
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: firstUser.id,
            email: firstUser.email,
            role_id: createdRoles.Owner?.id,
            is_active: true
          });

        if (createProfileError) {
          console.error('❌ Error creating profile:', createProfileError);
        } else {
          console.log(`✅ Created Owner profile for user: ${firstUser.email}`);
        }
      } else if (existingProfile && !existingProfile.role_id) {
        // Profile exists but no role, update to Owner
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ role_id: createdRoles.Owner?.id })
          .eq('id', firstUser.id);

        if (updateProfileError) {
          console.error('❌ Error updating profile:', updateProfileError);
        } else {
          console.log(`✅ Updated profile to Owner for user: ${firstUser.email}`);
        }
      } else {
        console.log(`ℹ️  User ${firstUser.email} already has a profile with role`);
      }
    }

    console.log('🎉 Permission system initialization completed successfully!');
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`- Roles created: ${Object.keys(createdRoles).length}`);
    console.log(`- Permissions created: ${validPermissions.length}`);
    
  } catch (error) {
    console.error('💥 Error initializing permission system:', error);
    process.exit(1);
  }
}

// Run the initialization
initializePermissionSystem();