"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getAvailablePages, validatePermissionHierarchy } from '@/lib/permission-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Permission {
  id?: string;
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface PermissionMatrixProps {
  roleId: string;
  roleName: string;
}

export function PermissionMatrix({ roleId, roleName }: PermissionMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const availablePages = getAvailablePages();

  useEffect(() => {
    loadPermissions();
  }, [roleId]);

  async function loadPermissions() {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', roleId);

      if (error) throw error;

      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  function getPermission(pageName: string): Permission {
    return permissions.find(p => p.page_name === pageName) || {
      role_id: roleId,
      page_name: pageName,
      can_view: false,
      can_edit: false
    };
  }

  function updatePermission(pageName: string, field: 'can_view' | 'can_edit', value: boolean) {
    setPermissions(prev => {
      const existing = prev.find(p => p.page_name === pageName);
      
      if (existing) {
        return prev.map(p => 
          p.page_name === pageName 
            ? { ...p, [field]: value }
            : p
        );
      } else {
        return [...prev, {
          role_id: roleId,
          page_name: pageName,
          can_view: field === 'can_view' ? value : false,
          can_edit: field === 'can_edit' ? value : false
        }];
      }
    });
  }

  async function savePermissions() {
    setSaving(true);
    try {
      // Validate hierarchy before saving
      const validatedPermissions = validatePermissionHierarchy(permissions);
      
      // Delete existing permissions for this role
      await supabase
        .from('permissions')
        .delete()
        .eq('role_id', roleId);

      // Insert new permissions (only those with view or edit access)
      const permissionsToSave = validatedPermissions.filter(p => p.can_view || p.can_edit);
      
      if (permissionsToSave.length > 0) {
        const { error } = await supabase
          .from('permissions')
          .insert(permissionsToSave.map(p => ({
            role_id: p.role_id,
            page_name: p.page_name,
            can_view: p.can_view,
            can_edit: p.can_edit
          })));

        if (error) throw error;
      }

      // Update local state with validated permissions
      setPermissions(validatedPermissions);
      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions for {roleName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure page access permissions. Parent pages will automatically get view access when child pages are enabled.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 font-medium text-sm border-b pb-2">
            <div>Page</div>
            <div className="text-center">View</div>
            <div className="text-center">Edit</div>
          </div>
          
          {availablePages.map((page) => {
            const permission = getPermission(page.path);
            const isParent = !page.parent;
            const indentLevel = page.parent ? (page.parent === '/dashboard' ? 1 : 2) : 0;
            
            return (
              <div 
                key={page.path} 
                className={`grid grid-cols-3 gap-4 items-center py-2 ${
                  isParent ? 'font-medium' : ''
                } ${indentLevel > 0 ? `ml-${indentLevel * 4}` : ''}`}
              >
                <div className={`${indentLevel > 0 ? 'text-muted-foreground' : ''}`}>
                  {indentLevel > 0 && '└─ '}
                  {page.name}
                </div>
                
                <div className="flex justify-center">
                  <Checkbox
                    checked={permission.can_view}
                    onCheckedChange={(checked) => 
                      updatePermission(page.path, 'can_view', checked as boolean)
                    }
                  />
                </div>
                
                <div className="flex justify-center">
                  <Checkbox
                    checked={permission.can_edit}
                    onCheckedChange={(checked) => {
                      const value = checked as boolean;
                      updatePermission(page.path, 'can_edit', value);
                      // If edit is enabled, view must also be enabled
                      if (value && !permission.can_view) {
                        updatePermission(page.path, 'can_view', true);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={savePermissions} 
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}