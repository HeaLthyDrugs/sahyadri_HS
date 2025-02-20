"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiSaveLine } from "react-icons/ri";

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

const AVAILABLE_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Users', path: '/dashboard/users' },
  { name: 'Roles', path: '/dashboard/users/roles' },
  { name: 'Permissions', path: '/dashboard/users/permissions' },
  // Add more pages as needed
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
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      setRoles(rolesData || []);
      
      if (rolesData?.length > 0) {
        setSelectedRole(rolesData[0].id);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [supabase]);

  // Fetch permissions when role is selected
  useEffect(() => {
    async function fetchPermissions() {
      if (!selectedRole) return;

      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', selectedRole);

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

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
    }

    fetchPermissions();
  }, [selectedRole, supabase]);

  const handlePermissionChange = (pagePath: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissions(permissions.map(permission => {
      if (permission.page_name === pagePath) {
        // If turning off view access, also turn off edit access
        if (field === 'can_view' && !value) {
          return { ...permission, can_view: false, can_edit: false };
        }
        // If turning on edit access, also turn on view access
        if (field === 'can_edit' && value) {
          return { ...permission, can_view: true, can_edit: true };
        }
        return { ...permission, [field]: value };
      }
      return permission;
    }));
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      // First, delete existing permissions for this role
      await supabase
        .from('permissions')
        .delete()
        .eq('role_id', selectedRole);

      // Then insert new permissions
      const { error } = await supabase
        .from('permissions')
        .insert(permissions);

      if (error) throw error;

      alert('Permissions saved successfully!');
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error saving permissions. Please try again.');
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Permission Management</h1>
        <p className="text-gray-500">Manage access permissions for each role</p>
      </div>

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
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Page
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                View Access
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Edit Access
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {AVAILABLE_PAGES.map((page) => {
              const permission = permissions.find(p => p.page_name === page.path);
              return (
                <tr key={page.path}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {page.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={permission?.can_view || false}
                      onChange={(e) => handlePermissionChange(page.path, 'can_view', e.target.checked)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={permission?.can_edit || false}
                      onChange={(e) => handlePermissionChange(page.path, 'can_edit', e.target.checked)}
                      disabled={!permission?.can_view}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded disabled:opacity-50"
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
          className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
        >
          <RiSaveLine />
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}


