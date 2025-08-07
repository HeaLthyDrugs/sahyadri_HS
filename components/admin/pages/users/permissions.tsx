"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiSaveLine, RiLoader4Line, RiCheckLine, RiErrorWarningLine, RiArrowRightSLine, RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import { useToast } from "@/hooks/use-toast";

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

interface NavigationItem {
  id: string;
  name: string;
  path: string;
  description: string;
  parentId?: string;
  isParent?: boolean;
}

// Define navigation structure with parent-child relationships
const NAVIGATION_STRUCTURE: NavigationItem[] = [
  { id: 'full_access', name: 'Full Access', path: '*', description: 'Grants complete access to all dashboard features', isParent: true },
  { id: 'dashboard', name: 'Dashboard Overview', path: '/dashboard', description: 'Main dashboard overview page', isParent: true },

  // Inventory Management section
  { id: 'inventory', name: 'Inventory Management', path: '/dashboard/inventory', description: 'Inventory management section', isParent: true },
  { id: 'inventory_packages', name: 'Packages', path: '/dashboard/inventory/packages', description: 'Manage inventory packages', parentId: 'inventory' },
  { id: 'inventory_products', name: 'Products', path: '/dashboard/inventory/products', description: 'Manage inventory products', parentId: 'inventory' },

  // Consumer Management section
  { id: 'consumer', name: 'Consumer Management', path: '/dashboard/consumer', description: 'Consumer management section', isParent: true },
  { id: 'consumer_programs', name: 'Programs', path: '/dashboard/consumer/programs', description: 'Manage consumer programs', parentId: 'consumer' },
  { id: 'consumer_participants', name: 'Participants', path: '/dashboard/consumer/participants', description: 'Manage consumer participants', parentId: 'consumer' },
  { id: 'consumer_staff', name: 'Staff', path: '/dashboard/consumer/staff', description: 'Manage consumer staff', parentId: 'consumer' },

  // Billing Management section
  { id: 'billing', name: 'Billing Management', path: '/dashboard/billing', description: 'Billing management section', isParent: true },
  { id: 'billing_entries', name: 'Entries', path: '/dashboard/billing/entries', description: 'Manage billing entries', parentId: 'billing' },
  { id: 'billing_invoice', name: 'Invoice', path: '/dashboard/billing/invoice', description: 'Manage billing invoices', parentId: 'billing' },
  { id: 'billing_reports', name: 'Reports', path: '/dashboard/billing/reports', description: 'View billing reports', parentId: 'billing' },

  // Users Management section
  { id: 'users', name: 'Users Management', path: '/dashboard/users', description: 'User management section', isParent: true },
  { id: 'users_manage', name: 'Manage Users', path: '/dashboard/users/manage', description: 'Manage system users', parentId: 'users' },
  { id: 'users_roles', name: 'Roles Management', path: '/dashboard/users/roles', description: 'Role management section', parentId: 'users' },
  { id: 'users_permissions', name: 'Permissions Management', path: '/dashboard/users/permissions', description: 'Permission management section', parentId: 'users' },

  // Configuration section
  { id: 'config', name: 'Configuration', path: '/dashboard/config', description: 'System configuration section', isParent: true },
];

export default function PermissionsPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const supabase = createClient();

  // Get all parent IDs for initial expansion
  const parentIds = NAVIGATION_STRUCTURE
    .filter(item => item.isParent && item.id !== 'full_access' && item.id !== 'dashboard')
    .map(item => item.id);

  // Initialize expanded sections with all parent IDs
  useEffect(() => {
    setExpandedSections(parentIds);
  }, []);

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
        const initializedPermissions = NAVIGATION_STRUCTURE.map(page => {
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

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
      if (pagePath === '*' && field === 'can_view' && value) {
        return newPermissions.map(p => ({
          ...p,
          can_view: true,
          can_edit: true
        }));
      }

      // Handle parent-child relationships
      const changedItem = NAVIGATION_STRUCTURE.find(item => item.path === pagePath);

      if (changedItem) {
        // If a parent item's permission is changed
        if (changedItem.isParent) {
          const childItems = NAVIGATION_STRUCTURE.filter(item => item.parentId === changedItem.id);

          // Apply the same permission to all children
          childItems.forEach(childItem => {
            const childIndex = newPermissions.findIndex(p => p.page_name === childItem.path);
            if (childIndex !== -1) {
              newPermissions[childIndex] = {
                ...newPermissions[childIndex],
                [field]: value,
                // If turning off view access, also turn off edit access
                ...(field === 'can_view' && !value ? { can_edit: false } : {}),
                // If turning on edit access, also turn on view access
                ...(field === 'can_edit' && value ? { can_view: true } : {})
              };
            }
          });
        }
        // Child permissions are now independent - no automatic parent selection
      }

      return newPermissions;
    });
  };

  // Helper function to check if parent should be visually indicated as partially selected
  const getParentState = (parentId: string, field: 'can_view' | 'can_edit') => {
    const childItems = NAVIGATION_STRUCTURE.filter(item => item.parentId === parentId);
    const childPermissions = childItems.map(child => 
      permissions.find(p => p.page_name === child.path)?.[field] || false
    );
    
    const allSelected = childPermissions.every(Boolean);
    const someSelected = childPermissions.some(Boolean);
    
    return {
      allSelected,
      someSelected,
      indeterminate: someSelected && !allSelected
    };
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

      // Refresh permissions
      const { data: newPermissions } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', selectedRole);

      if (newPermissions) {
        const updatedPermissions = NAVIGATION_STRUCTURE.map(page => {
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

      // Show success notification
      toast({
        title: "Success!",
        description: "Permissions have been saved successfully.",
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-800",
        action: (
          <div className="h-8 w-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <RiCheckLine className="h-5 w-5 text-green-600" />
          </div>
        )
      });

    } catch (error: any) {
      console.error('Error saving permissions:', error);
      // Show error notification
      toast({
        title: "Error!",
        description: error.message || "Failed to save permissions. Please try again.",
        variant: "destructive",
        className: "border-red-200",
        action: (
          <div className="h-8 w-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <RiErrorWarningLine className="h-5 w-5 text-red-600" />
          </div>
        )
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle all sections expanded/collapsed
  const toggleAllSections = () => {
    if (expandedSections.length === parentIds.length) {
      setExpandedSections([]);
    } else {
      setExpandedSections([...parentIds]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Group navigation items by parent
  const parentItems = NAVIGATION_STRUCTURE.filter(item => item.isParent);

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
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Manage Permissions</h3>
            <p className="text-sm text-gray-500">Configure access rights for each role in your system</p>
          </div>
          <button
            onClick={toggleAllSections}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center gap-1.5 transition-colors"
          >
            {expandedSections.length === parentIds.length ? (
              <>
                <RiArrowUpSLine className="w-4 h-4" />
                Collapse All
              </>
            ) : (
              <>
                <RiArrowDownSLine className="w-4 h-4" />
                Expand All
              </>
            )}
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {parentItems.map((parent) => {
            const parentPermission = permissions.find(p => p.page_name === parent.path);
            const isExpanded = expandedSections.includes(parent.id);
            const childItems = NAVIGATION_STRUCTURE.filter(item => item.parentId === parent.id);
            const hasChildren = childItems.length > 0;

            return (
              <div key={parent.id} className="bg-white">
                {/* Parent Item */}
                <div
                  className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''
                    }`}
                  onClick={() => hasChildren && toggleSection(parent.id)}
                >
                  <div className="flex items-center space-x-4">
                    {hasChildren && (
                      <span className="text-gray-400">
                        {isExpanded ? <RiArrowDownSLine className="w-5 h-5" /> : <RiArrowRightSLine className="w-5 h-5" />}
                      </span>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{parent.name}</h4>
                      <p className="text-xs text-gray-500">{parent.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const parentState = hasChildren ? getParentState(parent.id, 'can_view') : null;
                        const isChecked = hasChildren ? parentState?.allSelected : parentPermission?.can_view || false;
                        const isIndeterminate = hasChildren ? parentState?.indeterminate : false;
                        
                        return (
                          <input
                            type="checkbox"
                            id={`view-${parent.id}`}
                            checked={isChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate;
                            }}
                            onChange={(e) => handlePermissionChange(parent.path, 'can_view', e.target.checked)}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      })()}
                      <label htmlFor={`view-${parent.id}`} className="text-sm text-gray-700" onClick={(e) => e.stopPropagation()}>
                        View
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      {(() => {
                        const parentState = hasChildren ? getParentState(parent.id, 'can_edit') : null;
                        const isChecked = hasChildren ? parentState?.allSelected : parentPermission?.can_edit || false;
                        const isIndeterminate = hasChildren ? parentState?.indeterminate : false;
                        const viewState = hasChildren ? getParentState(parent.id, 'can_view') : null;
                        const canEdit = hasChildren ? (viewState?.someSelected || false) : (parentPermission?.can_view || false);
                        
                        return (
                          <input
                            type="checkbox"
                            id={`edit-${parent.id}`}
                            checked={isChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate;
                            }}
                            onChange={(e) => handlePermissionChange(parent.path, 'can_edit', e.target.checked)}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                            disabled={!canEdit}
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      })()}
                      <label htmlFor={`edit-${parent.id}`} className="text-sm text-gray-700" onClick={(e) => e.stopPropagation()}>
                        Edit
                      </label>
                    </div>
                  </div>
                </div>

                {/* Child Items */}
                {hasChildren && isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    {childItems.map((child) => {
                      const childPermission = permissions.find(p => p.page_name === child.path);
                      return (
                        <div key={child.id} className="px-6 py-3 ml-8 flex items-center justify-between border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center">
                            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                              <div className="h-6 border-l-2 border-gray-300"></div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-800">{child.name}</h5>
                              <p className="text-xs text-gray-500">{child.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`view-${child.id}`}
                                checked={childPermission?.can_view || false}
                                onChange={(e) => handlePermissionChange(child.path, 'can_view', e.target.checked)}
                                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`view-${child.id}`} className="text-sm text-gray-700">
                                View
                              </label>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`edit-${child.id}`}
                                checked={childPermission?.can_edit || false}
                                onChange={(e) => handlePermissionChange(child.path, 'can_edit', e.target.checked)}
                                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                disabled={!childPermission?.can_view}
                              />
                              <label htmlFor={`edit-${child.id}`} className="text-sm text-gray-700">
                                Edit
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSavePermissions}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors duration-200"
        >
          {isSaving ? (
            <>
              <RiLoader4Line className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <RiSaveLine className="w-5 h-5" />
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
} 