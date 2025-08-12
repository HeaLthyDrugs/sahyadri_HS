import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { hasStrictPermission } from '@/lib/permission-utils';

interface Permission {
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface StrictPermissionState {
  loading: boolean;
  hasViewAccess: boolean;
  hasEditAccess: boolean;
  permissions: Permission[];
  error: string | null;
}

/**
 * Hook for strict permission checking
 * Each page requires explicit permission - no inheritance
 */
export function useStrictPermissions(specificPath?: string) {
  const [state, setState] = useState<StrictPermissionState>({
    loading: true,
    hasViewAccess: false,
    hasEditAccess: false,
    permissions: [],
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
          setState({
            loading: false,
            hasViewAccess: false,
            hasEditAccess: false,
            permissions: [],
            error: 'User not authenticated'
          });
          return;
        }
        
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
          console.error('Profile/Role error:', {
            profileError,
            profileData,
            userId: user.id
          });
          setState({
            loading: false,
            hasViewAccess: false,
            hasEditAccess: false,
            permissions: [],
            error: profileError ? `Profile error: ${profileError.message}` : 'No role assigned to user'
          });
          return;
        }

        // Get permissions for the role
        const { data: permissions, error: permissionsError } = await supabase
          .from('permissions')
          .select('*')
          .eq('role_id', profileData.role_id);

        if (permissionsError) {
          console.error('Permissions query error:', permissionsError);
          throw permissionsError;
        }

        const permissionList = permissions || [];
        
        console.log('Permission check debug:', {
          userId: user.id,
          roleId: profileData.role_id,
          currentPath,
          permissionCount: permissionList.length,
          permissions: permissionList
        });

        // Use strict permission checking
        const hasViewAccess = hasStrictPermission(permissionList, currentPath, 'view');
        const hasEditAccess = hasStrictPermission(permissionList, currentPath, 'edit');
        
        console.log('Permission result:', {
          currentPath,
          hasViewAccess,
          hasEditAccess
        });

        setState({
          loading: false,
          hasViewAccess,
          hasEditAccess,
          permissions: permissionList,
          error: null
        });

      } catch (error) {
        console.error('Error checking strict permissions:', error);
        setState({
          loading: false,
          hasViewAccess: false,
          hasEditAccess: false,
          permissions: [],
          error: 'Error checking permissions'
        });
      }
    }

    checkPermissions();
  }, [specificPath || pathname, supabase]);

  return {
    ...state,
    isLoading: state.loading,
    canView: state.hasViewAccess,
    canEdit: state.hasEditAccess,
    /**
     * Check if user has permission for a specific path
     */
    hasPermissionFor: (path: string, action: 'view' | 'edit' = 'view') => {
      return hasStrictPermission(state.permissions, path, action);
    },
    /**
     * Get all paths the user has access to
     */
    getAccessiblePaths: () => {
      return state.permissions
        .filter(p => p.can_view)
        .map(p => p.page_name);
    },
    /**
     * Get all paths the user can edit
     */
    getEditablePaths: () => {
      return state.permissions
        .filter(p => p.can_edit)
        .map(p => p.page_name);
    }
  };
}