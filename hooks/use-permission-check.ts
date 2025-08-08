import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { checkPathPermission } from '@/lib/permission-utils';

interface Permission {
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

/**
 * Hook for checking specific permissions without being tied to current route
 * Useful for conditional rendering of buttons, links, etc.
 */
export function usePermissionCheck(paths: string | string[]) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadUserPermissions() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          setLoading(false);
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
          setError('Role not found');
          setLoading(false);
          return;
        }

        // Get permissions for the role
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('permissions')
          .select('*')
          .eq('role_id', profileData.role_id);

        if (permissionsError) {
          throw permissionsError;
        }

        setPermissions(permissionsData || []);
        setError(null);
      } catch (err) {
        console.error('Error loading permissions:', err);
        setError('Error loading permissions');
      } finally {
        setLoading(false);
      }
    }

    loadUserPermissions();
  }, [supabase]);

  // Helper function to check a specific path
  const checkPath = (path: string, requireEdit = false) => {
    if (loading || error) return { hasAccess: false, canEdit: false };
    return checkPathPermission(permissions, path, requireEdit);
  };

  // Helper function to check multiple paths
  const checkPaths = (pathList: string[], requireEdit = false) => {
    if (loading || error) return {};
    
    const results: Record<string, { hasAccess: boolean; canEdit: boolean }> = {};
    pathList.forEach(path => {
      results[path] = checkPathPermission(permissions, path, requireEdit);
    });
    return results;
  };

  // Main return based on input type
  if (Array.isArray(paths)) {
    return {
      loading,
      error,
      permissions: checkPaths(paths),
      checkPath,
      hasFullAccess: permissions.some(p => p.page_name === '*' && p.can_view)
    };
  } else {
    const result = checkPath(paths);
    return {
      loading,
      error,
      hasAccess: result.hasAccess,
      canEdit: result.canEdit,
      checkPath,
      hasFullAccess: permissions.some(p => p.page_name === '*' && p.can_view)
    };
  }
}