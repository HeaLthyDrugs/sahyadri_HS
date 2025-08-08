# Strict Permission System Guide

## Overview

The permission system has been updated to use **strict permission checking** where each page requires explicit permission. This prevents unauthorized access that was possible with the previous hierarchical inheritance model.

## Key Changes

### 1. Strict Permission Model
- Each page must have explicit permission in the database
- Parent permissions do NOT automatically grant child access
- Only full access (`*`) grants access to all pages

### 2. Database Structure
```sql
-- permissions table structure
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id),
  page_name TEXT NOT NULL, -- Exact path like '/dashboard/users/roles'
  can_view BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE
);
```

### 3. Required Permissions for Each Page

To access any page, you must have an explicit permission record:

```sql
-- Example: Grant access to user management pages
INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
('role-uuid', '/dashboard', true, false),
('role-uuid', '/dashboard/users', true, false),
('role-uuid', '/dashboard/users/roles', true, true),
('role-uuid', '/dashboard/users/permissions', true, true),
('role-uuid', '/dashboard/users/manage', true, true);
```

## Usage Examples

### 1. Using PermissionGuard (Recommended)

```tsx
import { StrictPermissionGuard } from '@/components/PermissionGuard';

// Protect a page component
export default function RolesPage() {
  return (
    <StrictPermissionGuard requiredPath="/dashboard/users/roles">
      <div>Roles management content</div>
    </StrictPermissionGuard>
  );
}

// Protect edit functionality
import { EditGuard } from '@/components/PermissionGuard';

export default function RolesPage() {
  return (
    <div>
      <h1>Roles</h1>
      <EditGuard requiredPath="/dashboard/users/roles">
        <button>Add New Role</button>
      </EditGuard>
    </div>
  );
}
```

### 2. Using withPermission HOC

```tsx
import { withStrictPermission } from '@/components/withPermission';

function RolesPageComponent({ canEdit }: { canEdit: boolean }) {
  return (
    <div>
      <h1>Roles</h1>
      {canEdit && <button>Add New Role</button>}
    </div>
  );
}

export default withStrictPermission(RolesPageComponent, '/dashboard/users/roles');
```

### 3. Using useStrictPermissions Hook

```tsx
import { useStrictPermissions } from '@/hooks/use-strict-permissions';

export default function RolesPage() {
  const { isLoading, canView, canEdit, hasPermissionFor } = useStrictPermissions('/dashboard/users/roles');

  if (isLoading) return <div>Loading...</div>;
  if (!canView) return <div>Access Denied</div>;

  return (
    <div>
      <h1>Roles</h1>
      {canEdit && <button>Add New Role</button>}
      
      {/* Check permission for other pages */}
      {hasPermissionFor('/dashboard/users/permissions', 'view') && (
        <a href="/dashboard/users/permissions">Manage Permissions</a>
      )}
    </div>
  );
}
```

### 4. Path-specific Permission Checking

```tsx
import { PathPermissionGuard } from '@/components/PermissionGuard';

export default function NavigationMenu() {
  return (
    <nav>
      <PathPermissionGuard path="/dashboard/users">
        <a href="/dashboard/users">Users</a>
      </PathPermissionGuard>
      
      <PathPermissionGuard path="/dashboard/users/roles" action="edit">
        <a href="/dashboard/users/roles">Manage Roles</a>
      </PathPermissionGuard>
      
      <PathPermissionGuard path="/dashboard/inventory">
        <a href="/dashboard/inventory">Inventory</a>
      </PathPermissionGuard>
    </nav>
  );
}
```

## Setting Up Permissions

### 1. Create Role
```sql
INSERT INTO roles (id, name, description) VALUES 
('role-uuid', 'Manager', 'Can manage users and view reports');
```

### 2. Assign Permissions
```sql
-- Grant specific page permissions
INSERT INTO permissions (role_id, page_name, can_view, can_edit) VALUES
('role-uuid', '/dashboard', true, false),
('role-uuid', '/dashboard/users', true, false),
('role-uuid', '/dashboard/users/manage', true, true),
('role-uuid', '/dashboard/inventory', true, false),
('role-uuid', '/dashboard/inventory/products', true, true);
```

### 3. Assign Role to User
```sql
UPDATE profiles SET role_id = 'role-uuid' WHERE id = 'user-uuid';
```

## Available Pages

All pages that can have permissions assigned:

- `/dashboard` - Main dashboard
- `/dashboard/users` - User management section
- `/dashboard/users/roles` - Role management
- `/dashboard/users/permissions` - Permission management
- `/dashboard/users/manage` - User management
- `/dashboard/inventory` - Inventory section
- `/dashboard/inventory/packages` - Package management
- `/dashboard/inventory/products` - Product management
- `/dashboard/consumer` - Consumer section
- `/dashboard/consumer/programs` - Program management
- `/dashboard/consumer/participants` - Participant management
- `/dashboard/consumer/staff` - Staff management
- `/dashboard/billing` - Billing section
- `/dashboard/billing/entries` - Billing entries
- `/dashboard/billing/invoice` - Invoice management
- `/dashboard/billing/reports` - Billing reports
- `/dashboard/config` - Configuration
- `/dashboard/profile` - User profile
- `/dashboard/signup` - User signup

## Migration from Old System

If you're updating existing code:

1. Replace `usePermissions` with `useStrictPermissions`
2. Replace `PermissionGuard` with `StrictPermissionGuard`
3. Update database permissions to include explicit records for each page
4. Test all protected routes to ensure proper access control

## Troubleshooting

### User Can't Access Page
1. Check if user has a role assigned in `profiles` table
2. Verify role has explicit permission for the exact page path
3. Ensure `can_view` is set to `true` for the permission record

### User Can View But Not Edit
1. Check if `can_edit` is set to `true` for the permission record
2. Verify the component is checking for edit permissions correctly

### Full Access Not Working
1. Ensure there's a permission record with `page_name = '*'` and `can_view = true`
2. This should grant access to all pages