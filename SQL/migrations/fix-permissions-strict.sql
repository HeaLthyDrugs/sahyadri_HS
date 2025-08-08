-- Migration script to implement strict permission system
-- This script sets up explicit permissions for each page

-- First, let's see what roles exist
-- SELECT * FROM roles;

-- Clear existing permissions (optional - uncomment if you want to start fresh)
-- DELETE FROM permissions;

-- Create comprehensive permissions for Admin role
-- Replace 'admin-role-id' with actual admin role UUID
DO $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    user_role_id UUID;
BEGIN
    -- Get role IDs (adjust role names as needed)
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' LIMIT 1;
    SELECT id INTO manager_role_id FROM roles WHERE name = 'Manager' LIMIT 1;
    SELECT id INTO user_role_id FROM roles WHERE name = 'User' LIMIT 1;

    -- Admin gets full access to everything
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
        (admin_role_id, '*', true, true)
        ON CONFLICT (role_id, page_name) DO UPDATE SET
        can_view = true, can_edit = true;
    END IF;

    -- Manager gets access to most pages
    IF manager_role_id IS NOT NULL THEN
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
        (manager_role_id, '/dashboard/profile', true, true)
        ON CONFLICT (role_id, page_name) DO UPDATE SET
        can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;
    END IF;

    -- Regular User gets limited access
    IF user_role_id IS NOT NULL THEN
        INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
        (user_role_id, '/dashboard', true, false),
        (user_role_id, '/dashboard/profile', true, true)
        ON CONFLICT (role_id, page_name) DO UPDATE SET
        can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;
    END IF;

END $$;

-- Create a function to easily add permissions for a role
CREATE OR REPLACE FUNCTION add_role_permissions(
    role_name TEXT,
    pages TEXT[],
    can_view_all BOOLEAN DEFAULT true,
    can_edit_all BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
DECLARE
    target_role_id UUID;
    page_path TEXT;
BEGIN
    -- Get role ID
    SELECT id INTO target_role_id FROM roles WHERE name = role_name LIMIT 1;
    
    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', role_name;
    END IF;

    -- Add permissions for each page
    FOREACH page_path IN ARRAY pages
    LOOP
        INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
        (target_role_id, page_path, can_view_all, can_edit_all)
        ON CONFLICT (role_id, page_name) DO UPDATE SET
        can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example usage of the function:
-- SELECT add_role_permissions('Manager', ARRAY['/dashboard/users/roles', '/dashboard/users/permissions'], true, true);

-- Create a function to check what permissions a role has
CREATE OR REPLACE FUNCTION get_role_permissions(role_name TEXT)
RETURNS TABLE(page_name TEXT, can_view BOOLEAN, can_edit BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT p.page_name, p.can_view, p.can_edit
    FROM permissions p
    JOIN roles r ON p.role_id = r.id
    WHERE r.name = role_name
    ORDER BY p.page_name;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_role_permissions('Manager');

-- Create a function to grant specific page access
CREATE OR REPLACE FUNCTION grant_page_access(
    role_name TEXT,
    page_path TEXT,
    allow_view BOOLEAN DEFAULT true,
    allow_edit BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
DECLARE
    target_role_id UUID;
BEGIN
    SELECT id INTO target_role_id FROM roles WHERE name = role_name LIMIT 1;
    
    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', role_name;
    END IF;

    INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
    (target_role_id, page_path, allow_view, allow_edit)
    ON CONFLICT (role_id, page_name) DO UPDATE SET
    can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT grant_page_access('Manager', '/dashboard/users/roles', true, true);

-- View all current permissions
SELECT 
    r.name as role_name,
    p.page_name,
    p.can_view,
    p.can_edit,
    p.created_at
FROM permissions p
JOIN roles r ON p.role_id = r.id
ORDER BY r.name, p.page_name;