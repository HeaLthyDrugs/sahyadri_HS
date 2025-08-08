# Permission System Documentation

## Overview
The SHS Dashboard now implements a robust hierarchical permission system that properly enforces page-level access control with parent-child relationships.

## Key Features

### 1. Hierarchical Permission Checking
- Parent pages automatically grant access when child pages are accessible
- Permissions are checked in order of specificity (most specific first)
- Supports dynamic routes and nested page structures

### 2. Components Available

#### PermissionGuard
```tsx
import { PermissionGuard } from '@/components/PermissionGuard';

<PermissionGuard requiredPath="/dashboard/users">
  <YourProtectedContent />
</PermissionGuard>
```

#### EditGuard
```tsx
import { EditGuard } from '@/components/PermissionGuard';

<EditGuard requiredPath="/dashboard/users">
  <Button>Edit Users</Button>
</EditGuard>
```

#### withPermission HOC
```tsx
import { withPermission } from '@/components/withPermission';

const ProtectedComponent = withPermission(
  ({ canEdit }) => <div>Content {canEdit && <Button>Edit</Button>}</div>,
  '/dashboard/users' // optional specific path
);
```

### 3. Hooks Available

#### usePermissions
```tsx
import { usePermissions } from '@/hooks/use-permissions';

const { isLoading, isAuthorized, canEdit } = usePermissions('/dashboard/users');
```

#### usePermissionCheck
```tsx
import { usePermissionCheck } from '@/hooks/use-permission-check';

// Single path
const { hasAccess, canEdit } = usePermissionCheck('/dashboard/users');

// Multiple paths
const { permissions } = usePermissionCheck([
  '/dashboard/users',
  '/dashboard/inventory'
]);
```

### 4. Permission Matrix Component
```tsx
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';

<PermissionMatrix roleId={roleId} roleName={roleName} />
```

## Database Structure

### Permissions Table
- `role_id`: UUID reference to roles table
- `page_name`: String path (e.g., '/dashboard/users')
- `can_view`: Boolean for view access
- `can_edit`: Boolean for edit access

### Page Hierarchy
The system recognizes these page relationships:
- `/dashboard` (root)
  - `/dashboard/users`
    - `/dashboard/users/roles`
    - `/dashboard/users/permissions`
    - `/dashboard/users/manage`
  - `/dashboard/inventory`
    - `/dashboard/inventory/packages`
    - `/dashboard/inventory/products`
  - `/dashboard/consumer`
    - `/dashboard/consumer/programs`
    - `/dashboard/consumer/participants`
    - `/dashboard/consumer/staff`
  - `/dashboard/billing`
    - `/dashboard/billing/entries`
    - `/dashboard/billing/invoice`
    - `/dashboard/billing/reports`
  - `/dashboard/config`
  - `/dashboard/profile`

## Usage Examples

### 1. Page Protection
```tsx
export default function UsersPage() {
  return (
    <PermissionGuard requiredPath="/dashboard/users">
      <div>
        <h1>User Management</h1>
        <EditGuard requiredPath="/dashboard/users">
          <Button>Add User</Button>
        </EditGuard>
      </div>
    </PermissionGuard>
  );
}
```

### 2. Navigation Menu
```tsx
export function Navigation() {
  const { permissions } = usePermissionCheck([
    '/dashboard/users',
    '/dashboard/inventory',
    '/dashboard/billing'
  ]);

  return (
    <nav>
      {permissions['/dashboard/users']?.hasAccess && (
        <Link href="/dashboard/users">Users</Link>
      )}
      {permissions['/dashboard/inventory']?.hasAccess && (
        <Link href="/dashboard/inventory">Inventory</Link>
      )}
      {permissions['/dashboard/billing']?.hasAccess && (
        <Link href="/dashboard/billing">Billing</Link>
      )}
    </nav>
  );
}
```

### 3. Conditional Buttons
```tsx
export function UserActions() {
  const { canEdit } = usePermissionCheck('/dashboard/users/manage');
  
  return (
    <div>
      <Button variant="outline">View Users</Button>
      {canEdit && <Button>Manage Users</Button>}
    </div>
  );
}
```

## Permission Assignment

Use the PermissionMatrix component in your permissions management page:

```tsx
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  return (
    <div>
      <RoleSelector onRoleSelect={setSelectedRole} />
      {selectedRole && (
        <PermissionMatrix 
          roleId={selectedRole} 
          roleName="Selected Role Name" 
        />
      )}
    </div>
  );
}
```

## Key Improvements

1. **Hierarchical Checking**: Child page access automatically grants parent page view access
2. **Centralized Logic**: All permission logic is in `/lib/permission-utils.ts`
3. **Flexible Components**: Multiple ways to implement permission checking
4. **Validation**: Automatic hierarchy validation when saving permissions
5. **Performance**: Efficient permission checking with minimal database queries

## Migration Notes

- Existing permission records will work with the new system
- The system now properly enforces parent-child relationships
- Use the PermissionMatrix component to easily manage role permissions
- All components now support custom path checking via `requiredPath` prop