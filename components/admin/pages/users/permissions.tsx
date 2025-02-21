"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiSaveLine } from "react-icons/ri";
import { toast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id?: string;
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

const AVAILABLE_PAGES = [
  { name: 'Full Access', path: '*', description: 'Grants complete access to all dashboard features' },
  { name: 'Dashboard Overview', path: '/dashboard', description: 'Main dashboard overview page' },
  { name: 'Users Management', path: '/dashboard/users', description: 'User management section' },
  { name: 'Roles Management', path: '/dashboard/users/roles', description: 'Role management section' },
  { name: 'Permissions Management', path: '/dashboard/users/permissions', description: 'Permission management section' },
  { name: 'Inventory Management', path: '/dashboard/inventory', description: 'Inventory management section' },
  { name: 'Consumer Management', path: '/dashboard/consumer', description: 'Consumer management section' },
  { name: 'Billing Management', path: '/dashboard/billing', description: 'Billing management section' },
  { name: 'Configuration', path: '/dashboard/config', description: 'System configuration section' },
];

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // Fetch roles and permissions
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .order('name');

        if (rolesError) throw rolesError;

        setRoles(rolesData || []);
        
        if (rolesData?.length > 0) {
          setSelectedRole(rolesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast({
          title: "Error",
          description: "Failed to fetch roles. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Fetch permissions when role is selected
  useEffect(() => {
    async function fetchPermissions() {
      if (!selectedRole) return;

      try {
        const { data, error } = await supabase
          .from('permissions')
          .select('*')
          .eq('role_id', selectedRole);

        if (error) throw error;

        // Initialize permissions for all pages
        const initializedPermissions = AVAILABLE_PAGES.map(page => {
          const existingPermission = data?.find(p => p.page_name === page.path);
          return existingPermission || {
            role_id: selectedRole,
            page_name: page.path,
            can_view: false,
            can_edit: false
          };
        });

        setPermissions(initializedPermissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch permissions. Please try again.",
          variant: "destructive",
        });
      }
    }

    fetchPermissions();
  }, [selectedRole]);

  const handlePermissionChange = (pagePath: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissions(prevPermissions => {
      const newPermissions = [...prevPermissions];
      const index = newPermissions.findIndex(p => p.page_name === pagePath);
      
      if (index !== -1) {
        newPermissions[index] = {
          ...newPermissions[index],
          [field]: value,
          // If turning off view access, also turn off edit access
          ...(field === 'can_view' && !value ? { can_edit: false } : {}),
          // If turning on edit access, also turn on view access
          ...(field === 'can_edit' && value ? { can_view: true } : {})
        };
      }

      // If this is full access being turned on
      if (pagePath === '*' && value) {
        return newPermissions.map(p => ({
          ...p,
          can_view: true,
          can_edit: true
        }));
      }

      return newPermissions;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);

    try {
      // First, delete existing permissions for this role
      const { error: deleteError } = await supabase
        .from('permissions')
        .delete()
        .eq('role_id', selectedRole);

      if (deleteError) throw deleteError;

      // Filter out permissions that have neither view nor edit access
      const permissionsToSave = permissions.filter(p => p.can_view || p.can_edit);

      if (permissionsToSave.length > 0) {
        // Insert new permissions
        const { error: insertError } = await supabase
          .from('permissions')
          .insert(
            permissionsToSave.map(({ id, ...permission }) => ({
              ...permission,
              role_id: selectedRole
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Permissions saved successfully.",
      });

      // Refresh permissions
      const { data: newPermissions } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', selectedRole);

      if (newPermissions) {
        const updatedPermissions = AVAILABLE_PAGES.map(page => {
          const existingPermission = newPermissions.find(p => p.page_name === page.path);
          return existingPermission || {
            role_id: selectedRole,
            page_name: page.path,
            can_view: false,
            can_edit: false
          };
        });
        setPermissions(updatedPermissions);
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Role
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Permissions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Page
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                View Access
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Edit Access
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {AVAILABLE_PAGES.map((page) => {
              const permission = permissions.find(p => p.page_name === page.path);
              return (
                <tr key={page.path}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {page.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {page.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    <input
                      type="checkbox"
                      checked={permission?.can_view || false}
                      onChange={(e) => handlePermissionChange(page.path, 'can_view', e.target.checked)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    <input
                      type="checkbox"
                      checked={permission?.can_edit || false}
                      onChange={(e) => handlePermissionChange(page.path, 'can_edit', e.target.checked)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                      disabled={!permission?.can_view}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSavePermissions}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
        >
          <RiSaveLine className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
} 