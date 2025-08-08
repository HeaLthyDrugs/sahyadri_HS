import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { useStrictPermissions } from '@/hooks/use-strict-permissions';
import { NoAccess } from './NoAccess';

interface PermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireEdit?: boolean;
  requiredPath?: string;
  strict?: boolean; // Use strict permission checking
}

export function PermissionGuard({ 
  children, 
  fallback = <NoAccess />,
  requireEdit = false,
  requiredPath,
  strict = true // Default to strict checking
}: PermissionGuardProps) {
  const legacyPermissions = usePermissions(requiredPath);
  const strictPermissions = useStrictPermissions(requiredPath);
  
  // Use strict permissions by default, fallback to legacy for backward compatibility
  const permissions = strict ? strictPermissions : legacyPermissions;
  const { isLoading, canView, canEdit } = permissions;
  const isAuthorized = strict ? canView : legacyPermissions.isAuthorized;
  const hasEditAccess = strict ? canEdit : legacyPermissions.canEdit;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthorized || (requireEdit && !hasEditAccess)) {
    return fallback;
  }

  return <>{children}</>;
}

interface EditGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPath?: string;
  strict?: boolean;
}

export function EditGuard({ 
  children, 
  fallback = null, 
  requiredPath,
  strict = true 
}: EditGuardProps) {
  const legacyPermissions = usePermissions(requiredPath);
  const strictPermissions = useStrictPermissions(requiredPath);
  
  const canEdit = strict ? strictPermissions.canEdit : legacyPermissions.canEdit;

  if (!canEdit) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Strict Permission Guard - Only allows access with explicit permissions
 */
export function StrictPermissionGuard({ 
  children, 
  fallback = <NoAccess />,
  requireEdit = false,
  requiredPath
}: Omit<PermissionGuardProps, 'strict'>) {
  return (
    <PermissionGuard
      strict={true}
      requireEdit={requireEdit}
      requiredPath={requiredPath}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * Path-specific Permission Guard
 * Checks permission for a specific path regardless of current route
 */
interface PathPermissionGuardProps {
  children: ReactNode;
  path: string;
  action?: 'view' | 'edit';
  fallback?: ReactNode;
}

export function PathPermissionGuard({
  children,
  path,
  action = 'view',
  fallback = null
}: PathPermissionGuardProps) {
  const { isLoading, hasPermissionFor } = useStrictPermissions();
  
  if (isLoading) {
    return (
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500"></div>
    );
  }
  
  if (!hasPermissionFor(path, action)) {
    return fallback;
  }
  
  return <>{children}</>;
} 