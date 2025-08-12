-- Initialize Permission System
-- This script sets up roles and permissions for the SHS Dashboard

-- Create default roles if they don't exist
INSERT INTO roles (name, description) VALUES
('Owner', 'System owner with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
('Admin', 'Administrator with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
('Manager', 'Manager with limited access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
('User', 'Basic user with minimal access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
('Viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Clear existing permissions to start fresh
DELETE FROM permissions;

-- Get role IDs
DO $$
DECLARE
    owner_role_id UUID;
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
    viewer_role_id UUID;
BEGIN
    -- Get role IDs
    SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner';
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin';
    SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager';
    SELECT id INTO user_role_id FROM roles WHERE name = 'User';
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'Viewer';

    -- Owner gets full access (wildcard)
    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (owner_role_id, '*', true, true);

    -- Admin gets full access (wildcard)
    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (admin_role_id, '*', true, true);

    -- Manager gets specific permissions
    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (manager_role_id, '/dashboard', true, false),
    (manager_role_id, '/dashboard/users', true, false),
    (manager_role_id, '/dashboard/users/manage', true, true),
    (manager_role_id, '/dashboard/inventory', true, false),
    (manager_role_id, '/dashboard/inventory/packages', true, true),
    (manager_role_id, '/dashboard/inventory/products', true, true),
    (manager_role_id, '/dashboard/consumer', true, false),
    (manager_role_id, '/dashboard/consumer/programs', true, true),
    (manager_role_id, '/dashboard/consumer/participants', true, true),
    (manager_role_id, '/dashboard/consumer/staff', true, true),
    (manager_role_id, '/dashboard/billing', true, false),
    (manager_role_id, '/dashboard/billing/entries', true, true),
    (manager_role_id, '/dashboard/billing/invoice', true, true),
    (manager_role_id, '/dashboard/billing/reports', true, false),
    (manager_role_id, '/dashboard/profile', true, true);

    -- User gets limited permissions
    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (user_role_id, '/dashboard', true, false),
    (user_role_id, '/dashboard/consumer', true, false),
    (user_role_id, '/dashboard/consumer/programs', true, false),
    (user_role_id, '/dashboard/consumer/participants', true, false),
    (user_role_id, '/dashboard/billing', true, false),
    (user_role_id, '/dashboard/billing/entries', true, false),
    (user_role_id, '/dashboard/billing/reports', true, false),
    (user_role_id, '/dashboard/profile', true, true);

    -- Viewer gets read-only access
    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (viewer_role_id, '/dashboard', true, false),
    (viewer_role_id, '/dashboard/consumer', true, false),
    (viewer_role_id, '/dashboard/consumer/programs', true, false),
    (viewer_role_id, '/dashboard/consumer/participants', true, false),
    (viewer_role_id, '/dashboard/billing', true, false),
    (viewer_role_id, '/dashboard/billing/entries', true, false),
    (viewer_role_id, '/dashboard/billing/reports', true, false),
    (viewer_role_id, '/dashboard/profile', true, false);

    RAISE NOTICE 'Permissions initialized successfully';
    RAISE NOTICE 'Owner role: %', owner_role_id;
    RAISE NOTICE 'Admin role: %', admin_role_id;
    RAISE NOTICE 'Manager role: %', manager_role_id;
    RAISE NOTICE 'User role: %', user_role_id;
    RAISE NOTICE 'Viewer role: %', viewer_role_id;
END $$;

-- Update first user to be Owner if no owner exists
DO $$
DECLARE
    owner_role_id UUID;
    first_user_id UUID;
BEGIN
    SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner';
    
    -- Check if there's already an owner
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role_id = owner_role_id) THEN
        -- Get the first user
        SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            -- Update or insert profile
            INSERT INTO profiles (id, email, role_id, is_active)
            SELECT first_user_id, email, owner_role_id, true
            FROM auth.users WHERE id = first_user_id
            ON CONFLICT (id) DO UPDATE SET
            role_id = owner_role_id,
            is_active = true;
            
            RAISE NOTICE 'First user % set as Owner', first_user_id;
        END IF;
    END IF;
END $$;

-- Show final results
SELECT 
    r.name as role_name,
    COUNT(p.id) as permission_count
FROM roles r
LEFT JOIN permissions p ON r.id = p.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

SELECT 
    r.name as role_name,
    p.page_name,
    p.can_view,
    p.can_edit
FROM permissions p
JOIN roles r ON p.role_id = r.id
ORDER BY r.name, p.page_name;