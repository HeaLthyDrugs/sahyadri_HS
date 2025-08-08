import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { checkPathPermission, hasStrictPermission } from '@/lib/permission-utils';

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

export function usePermissions(specificPath?: string) {
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
        
        // Use specific path if provided, otherwise use current pathname
        const currentPath = specificPath || pathname;

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

        // Use strict permission checking - each page needs explicit permission
        const { hasAccess, canEdit } = checkPathPermission(
          permissions || [],
          currentPath
        );

        setPermissionState({
          loading: false,
          hasAccess,
          canEdit,
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
  }, [specificPath || pathname, supabase]);

  return {
    ...permissionState,
    isLoading: permissionState.loading,
    isAuthorized: permissionState.hasAccess,
    canEdit: permissionState.canEdit,
    error: permissionState.error
  };
} 