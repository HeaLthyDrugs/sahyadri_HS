-- Function to initialize owner and admin roles
CREATE OR REPLACE FUNCTION init_admin()
RETURNS void AS $$
DECLARE
    owner_role_id UUID;
    admin_role_id UUID;
    first_user_id UUID;
BEGIN
    -- Create owner role if it doesn't exist
    INSERT INTO roles (name, description)
    VALUES ('Owner', 'System owner with full access and user management capabilities')
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description
    RETURNING id INTO owner_role_id;

    -- Create admin role if it doesn't exist
    INSERT INTO roles (name, description)
    VALUES ('Admin', 'Administrative access with limited user management')
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description
    RETURNING id INTO admin_role_id;

    RAISE NOTICE 'Owner role ID: %', owner_role_id;
    RAISE NOTICE 'Admin role ID: %', admin_role_id;

    -- Create all necessary modules
    INSERT INTO modules (name, description, path)
    VALUES 
        ('Dashboard', 'Main dashboard access', '/dashboard'),
        ('Users', 'User management', '/dashboard/users/manage'),
        ('Roles', 'Role management', '/dashboard/users/roles'),
        ('Modules', 'Module management', '/dashboard/users/modules'),
        ('Programs', 'Program management', '/dashboard/consumer/programs'),
        ('Products', 'Product management', '/dashboard/inventory/products'),
        ('Packages', 'Package management', '/dashboard/inventory/packages'),
        ('Staff', 'Staff management', '/dashboard/consumer/staff'),
        ('Participants', 'Participant management', '/dashboard/consumer/participants'),
        ('Billing', 'Billing management', '/dashboard/billing')
    ON CONFLICT (name) DO NOTHING;

    -- Assign all modules to owner role
    INSERT INTO role_modules (role_id, module_id)
    SELECT owner_role_id, id FROM modules
    ON CONFLICT DO NOTHING;

    -- Assign modules to admin role (excluding sensitive modules)
    INSERT INTO role_modules (role_id, module_id)
    SELECT admin_role_id, id 
    FROM modules 
    WHERE name NOT IN ('Roles', 'Modules')  -- Admins can't manage roles and modules
    ON CONFLICT DO NOTHING;

    -- Get the first user
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;

    RAISE NOTICE 'First user ID: %', first_user_id;

    -- If there's a first user, make them owner
    IF first_user_id IS NOT NULL THEN
        -- Update or insert into profiles
        INSERT INTO profiles (id, full_name, role_id, is_active)
        VALUES (
            first_user_id,
            (SELECT email FROM auth.users WHERE id = first_user_id),
            owner_role_id,  -- Set as owner instead of admin
            true
        )
        ON CONFLICT (id) DO UPDATE
        SET role_id = owner_role_id,
            is_active = true;
        
        RAISE NOTICE 'Updated profile for user % as Owner', first_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;

    -- Log final counts
    RAISE NOTICE 'Verification counts:';
    RAISE NOTICE 'Roles count: %', (SELECT COUNT(*) FROM roles);
    RAISE NOTICE 'Modules count: %', (SELECT COUNT(*) FROM modules);
    RAISE NOTICE 'Role-modules count: %', (SELECT COUNT(*) FROM role_modules);
    RAISE NOTICE 'Owner profiles count: %', (SELECT COUNT(*) FROM profiles WHERE role_id = owner_role_id);
    RAISE NOTICE 'Admin profiles count: %', (SELECT COUNT(*) FROM profiles WHERE role_id = admin_role_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 