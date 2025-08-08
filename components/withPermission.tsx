"use client";

import { useStrictPermissions } from '@/hooks/use-strict-permissions';
import { NoAccess } from '@/components/NoAccess';

interface WithPermissionOptions {
  strict?: boolean;
  requireEdit?: boolean;
}

/**
 * Higher-order component for permission-based access control
 * Uses strict permission checking by default
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P & { canEdit: boolean }>,
  requiredPath?: string,
  options: WithPermissionOptions = { strict: true, requireEdit: false }
) {
  return function PermissionWrapper(props: P) {
    const { isLoading, canView, canEdit, error } = useStrictPermissions(requiredPath);

    if (isLoading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      );
    }

    // Check access based on requirements
    const hasRequiredAccess = options.requireEdit ? canEdit : canView;
    
    if (!hasRequiredAccess) {
      return <NoAccess />;
    }

    return <WrappedComponent {...props} canEdit={canEdit} />;
  };
}

/**
 * HOC for strict permission checking - requires explicit permission for each page
 */
export function withStrictPermission<P extends object>(
  WrappedComponent: React.ComponentType<P & { canEdit: boolean }>,
  requiredPath?: string,
  requireEdit = false
) {
  return withPermission(WrappedComponent, requiredPath, { strict: true, requireEdit });
}

/**
 * HOC for edit permission checking - requires edit access
 */
export function withEditPermission<P extends object>(
  WrappedComponent: React.ComponentType<P & { canEdit: boolean }>,
  requiredPath?: string
) {
  return withPermission(WrappedComponent, requiredPath, { strict: true, requireEdit: true });
} 