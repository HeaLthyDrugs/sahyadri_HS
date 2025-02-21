import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { NoAccess } from './NoAccess';

interface PermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireEdit?: boolean;
}

export function PermissionGuard({ 
  children, 
  fallback = <NoAccess />,
  requireEdit = false 
}: PermissionGuardProps) {
  const { isLoading, isAuthorized, canEdit, error } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthorized || (requireEdit && !canEdit)) {
    return fallback;
  }

  return <>{children}</>;
}

interface EditGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function EditGuard({ children, fallback = null }: EditGuardProps) {
  const { canEdit } = usePermissions();

  if (!canEdit) {
    return fallback;
  }

  return <>{children}</>;
} 