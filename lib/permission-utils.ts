/**
 * Permission utility functions for the SHS Dashboard
 * Provides centralized permission checking and path management
 * 
 * STRICT PERMISSION MODEL:
 * - Each page requires explicit permission
 * - Parent permissions do not automatically grant child access
 * - Only specific parent-child relationships allow inheritance
 * - Full access (*) grants access to all pages
 */

// Define page hierarchy for permission checking
// Each page must have explicit permission - no inheritance by default
export const PAGE_HIERARCHY: Record<string, string[]> = {
  '/dashboard': ['/dashboard'],
  '/dashboard/users': ['/dashboard/users', '/dashboard'],
  '/dashboard/users/roles': ['/dashboard/users/roles'],
  '/dashboard/users/permissions': ['/dashboard/users/permissions'],
  '/dashboard/users/manage': ['/dashboard/users/manage'],
  '/dashboard/inventory': ['/dashboard/inventory', '/dashboard'],
  '/dashboard/inventory/packages': ['/dashboard/inventory/packages'],
  '/dashboard/inventory/products': ['/dashboard/inventory/products'],
  '/dashboard/consumer': ['/dashboard/consumer', '/dashboard'],
  '/dashboard/consumer/programs': ['/dashboard/consumer/programs'],
  '/dashboard/consumer/participants': ['/dashboard/consumer/participants'],
  '/dashboard/consumer/staff': ['/dashboard/consumer/staff'],
  '/dashboard/billing': ['/dashboard/billing', '/dashboard'],
  '/dashboard/billing/entries': ['/dashboard/billing/entries'],
  '/dashboard/billing/invoice': ['/dashboard/billing/invoice'],
  '/dashboard/billing/reports': ['/dashboard/billing/reports'],
  '/dashboard/config': ['/dashboard/config'],
  '/dashboard/profile': ['/dashboard/profile'],
  '/dashboard/signup': ['/dashboard/signup']
};

/**
 * Get permission paths for a route (including parent paths)
 * Returns paths in order of specificity (most specific first)
 */
export function getPermissionPaths(pathname: string): string[] {
  // Handle dynamic routes by removing dynamic segments
  const cleanPath = pathname.replace(/\/\[.*?\]/g, '').replace(/\/$/, '') || '/';
  
  // Return hierarchy if exists, otherwise return the path itself with dashboard fallback
  return PAGE_HIERARCHY[cleanPath] || [cleanPath, '/dashboard'];
}

/**
 * Get all parent paths for a given path
 */
export function getParentPaths(pathname: string): string[] {
  const cleanPath = pathname.replace(/\/\[.*?\]/g, '').replace(/\/$/, '') || '/';
  const parts = cleanPath.split('/').filter(Boolean);
  const paths: string[] = [];
  
  for (let i = parts.length - 1; i > 0; i--) {
    const parentPath = '/' + parts.slice(0, i).join('/');
    paths.push(parentPath);
  }
  
  if (cleanPath !== '/dashboard') {
    paths.push('/dashboard');
  }
  
  return paths;
}

/**
 * Check if a user has permission for a specific path
 * Uses strict path-based permission checking with parent-child hierarchy
 */
export function checkPathPermission(
  permissions: Array<{ page_name: string; can_view: boolean; can_edit: boolean }>,
  pathname: string,
  requireEdit = false
): { hasAccess: boolean; canEdit: boolean } {
  // Check for full access first
  const hasFullAccess = permissions.some(
    (p) => p.page_name === '*' && p.can_view
  );

  if (hasFullAccess) {
    return { hasAccess: true, canEdit: true };
  }

  // Clean the pathname
  const cleanPath = pathname.replace(/\/\[.*?\]/g, '').replace(/\/$/, '') || '/';
  
  // First, check for exact path match (most specific)
  const exactPermission = permissions.find((p) => p.page_name === cleanPath);
  if (exactPermission) {
    const hasAccess = exactPermission.can_view;
    const canEdit = exactPermission.can_edit;
    
    if (requireEdit) {
      return { hasAccess: hasAccess && canEdit, canEdit };
    }
    
    return { hasAccess, canEdit };
  }

  // If no exact match, check parent permissions only if child doesn't have explicit denial
  // This ensures that explicit permissions take precedence over inherited ones
  const permissionPaths = getPermissionPaths(cleanPath);
  
  // Check if there's any explicit permission for this path or its children
  const hasExplicitPermission = permissions.some(p => 
    p.page_name === cleanPath || cleanPath.startsWith(p.page_name + '/')
  );
  
  // If there's no explicit permission, check parent hierarchy
  if (!hasExplicitPermission) {
    for (let i = 1; i < permissionPaths.length; i++) {
      const parentPath = permissionPaths[i];
      const parentPermission = permissions.find((p) => p.page_name === parentPath);
      
      if (parentPermission && parentPermission.can_view) {
        const hasAccess = parentPermission.can_view;
        const canEdit = parentPermission.can_edit;
        
        if (requireEdit) {
          return { hasAccess: hasAccess && canEdit, canEdit };
        }
        
        return { hasAccess, canEdit };
      }
    }
  }

  return { hasAccess: false, canEdit: false };
}

/**
 * Get all available pages for permission assignment
 */
export function getAvailablePages(): Array<{ path: string; name: string; parent?: string }> {
  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/dashboard/users', name: 'User Management', parent: '/dashboard' },
    { path: '/dashboard/users/roles', name: 'Roles', parent: '/dashboard/users' },
    { path: '/dashboard/users/permissions', name: 'Permissions', parent: '/dashboard/users' },
    { path: '/dashboard/users/manage', name: 'Manage Users', parent: '/dashboard/users' },
    { path: '/dashboard/inventory', name: 'Inventory', parent: '/dashboard' },
    { path: '/dashboard/inventory/packages', name: 'Packages', parent: '/dashboard/inventory' },
    { path: '/dashboard/inventory/products', name: 'Products', parent: '/dashboard/inventory' },
    { path: '/dashboard/consumer', name: 'Consumer', parent: '/dashboard' },
    { path: '/dashboard/consumer/programs', name: 'Programs', parent: '/dashboard/consumer' },
    { path: '/dashboard/consumer/participants', name: 'Participants', parent: '/dashboard/consumer' },
    { path: '/dashboard/consumer/staff', name: 'Staff', parent: '/dashboard/consumer' },
    { path: '/dashboard/billing', name: 'Billing', parent: '/dashboard' },
    { path: '/dashboard/billing/entries', name: 'Entries', parent: '/dashboard/billing' },
    { path: '/dashboard/billing/invoice', name: 'Invoice', parent: '/dashboard/billing' },
    { path: '/dashboard/billing/reports', name: 'Reports', parent: '/dashboard/billing' },
    { path: '/dashboard/config', name: 'Configuration', parent: '/dashboard' },
    { path: '/dashboard/profile', name: 'Profile', parent: '/dashboard' },
    { path: '/dashboard/signup', name: 'Signup', parent: '/dashboard' }
  ];

  return pages;
}

/**
 * Check if a path requires parent permissions
 */
export function requiresParentPermission(pathname: string): boolean {
  const cleanPath = pathname.replace(/\/\[.*?\]/g, '').replace(/\/$/, '') || '/';
  
  // These paths require explicit permission and don't inherit from parents
  const strictPaths = [
    '/dashboard/users/roles',
    '/dashboard/users/permissions', 
    '/dashboard/users/manage',
    '/dashboard/inventory/packages',
    '/dashboard/inventory/products',
    '/dashboard/consumer/programs',
    '/dashboard/consumer/participants',
    '/dashboard/consumer/staff',
    '/dashboard/billing/entries',
    '/dashboard/billing/invoice',
    '/dashboard/billing/reports',
    '/dashboard/config',
    '/dashboard/signup'
  ];
  
  return !strictPaths.includes(cleanPath);
}

/**
 * Check if user has permission for a specific path with strict enforcement
 * This function enforces that each page must have explicit permission
 * Specific page permissions override wildcard permissions
 */
export function hasStrictPermission(
  permissions: Array<{ page_name: string; can_view: boolean; can_edit: boolean }>,
  pathname: string,
  action: 'view' | 'edit' = 'view'
): boolean {
  // Clean the pathname
  const cleanPath = pathname.replace(/\/\[.*?\]/g, '').replace(/\/$/, '') || '/';
  
  // Find exact permission for this path (specific permissions take priority)
  const specificPermission = permissions.find((p) => p.page_name === cleanPath);
  
  if (specificPermission) {
    if (action === 'edit') {
      return specificPermission.can_view && specificPermission.can_edit;
    }
    return specificPermission.can_view;
  }

  // If no specific permission found, check for wildcard permission
  const wildcardPermission = permissions.find((p) => p.page_name === '*');
  
  if (wildcardPermission && wildcardPermission.can_view) {
    if (action === 'edit') {
      return wildcardPermission.can_edit;
    }
    return true;
  }

  return false;
}

/**
 * Validate permission hierarchy
 * Ensures that permissions are properly structured
 */
export function validatePermissionHierarchy(
  permissions: Array<{ page_name: string; can_view: boolean; can_edit: boolean }>
): Array<{ page_name: string; can_view: boolean; can_edit: boolean }> {
  // Return permissions as-is for strict checking
  // Each page must have explicit permission
  return permissions.filter(p => p.page_name !== '' && p.page_name !== null);
}