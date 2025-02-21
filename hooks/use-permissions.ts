import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface Permission {
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface PermissionState {
  loading: boolean;
  hasAccess: boolean;
  canEdit: boolean;
  error: string | null;
}

// Map dashboard routes to permission paths
const PERMISSION_PATH_MAP: Record<string, string> = {
  '/dashboard': '/dashboard',
  '/dashboard/users': '/dashboard/users',
  '/dashboard/users/roles': '/dashboard/users/roles',
  '/dashboard/users/permissions': '/dashboard/users/permissions',
  '/dashboard/inventory/packages': '/dashboard/inventory',
  '/dashboard/inventory/products': '/dashboard/inventory',
  '/dashboard/consumer/programs': '/dashboard/consumer',
  '/dashboard/consumer/participants': '/dashboard/consumer',
  '/dashboard/consumer/staff': '/dashboard/consumer',
  '/dashboard/billing/entries': '/dashboard/billing',
  '/dashboard/billing/invoice': '/dashboard/billing',
  '/dashboard/billing/report': '/dashboard/billing',
  '/dashboard/config': '/dashboard/config'
};

export function usePermissions() {
  const [permissionState, setPermissionState] = useState<PermissionState>({
    loading: true,
    hasAccess: false,
    canEdit: false,
    error: null
  });
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkPermissions() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user) {
          setPermissionState({
            loading: false,
            hasAccess: false,
            canEdit: false,
            error: 'User not authenticated'
          });
          return;
        }

        // Get user's role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            role_id,
            roles!inner(
              id,
              name
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError || !profileData?.role_id) {
          setPermissionState({
            loading: false,
            hasAccess: false,
            canEdit: false,
            error: 'Role not found'
          });
          return;
        }

        // Get permissions for the role
        const { data: permissions, error: permissionsError } = await supabase
          .from('permissions')
          .select('*')
          .eq('role_id', profileData.role_id);

        if (permissionsError) {
          throw permissionsError;
        }

        // Check for full access first
        const hasFullAccess = permissions?.some(
          (p: Permission) => p.page_name === '*' && p.can_view
        );

        if (hasFullAccess) {
          setPermissionState({
            loading: false,
            hasAccess: true,
            canEdit: true,
            error: null
          });
          return;
        }

        // Get the permission path for the current route
        const permissionPath = PERMISSION_PATH_MAP[pathname] || pathname;

        // Check specific page permission
        const pagePermission = permissions?.find(
          (p: Permission) => p.page_name === permissionPath
        );

        setPermissionState({
          loading: false,
          hasAccess: pagePermission?.can_view ?? false,
          canEdit: pagePermission?.can_edit ?? false,
          error: null
        });

      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionState({
          loading: false,
          hasAccess: false,
          canEdit: false,
          error: 'Error checking permissions'
        });
      }
    }

    checkPermissions();
  }, [pathname, supabase]);

  return {
    ...permissionState,
    isLoading: permissionState.loading,
    isAuthorized: permissionState.hasAccess,
    canEdit: permissionState.canEdit,
    error: permissionState.error
  };
} 