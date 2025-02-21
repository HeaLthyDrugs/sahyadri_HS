"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiAddLine, RiEditLine, RiDeleteBinLine } from "react-icons/ri";
import { toast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // Fetch roles
  useEffect(() => {
    async function fetchRoles() {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .order('name');

        if (error) {
          toast({
            title: "Error",
            description: "Failed to fetch roles. Please try again.",
            variant: "destructive",
          });
          console.error('Error fetching roles:', error);
          return;
        }

        setRoles(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoles();
  }, []);

  // Add new role
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('roles')
        .insert([{ 
          name: newRole.trim(),
          description: `${newRole.trim()} role` 
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to create roles. Please contact an administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create role. Please try again.",
            variant: "destructive",
          });
        }
        console.error('Error adding role:', error);
        return;
      }

      setRoles([...roles, data]);
      setNewRole("");
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('roles')
        .update({ 
          name: editingRole.name.trim(),
          description: `${editingRole.name.trim()} role`,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRole.id);

      if (error) {
        if (error.code === '42501') {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to update roles. Please contact an administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to update role. Please try again.",
            variant: "destructive",
          });
        }
        console.error('Error updating role:', error);
        return;
      }

      setRoles(roles.map(role => 
        role.id === editingRole.id ? editingRole : role
      ));
      setEditingRole(null);
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete role
  const handleDeleteRole = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this role?');
    if (!confirmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '42501') {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to delete roles. Please contact an administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to delete role. Please try again.",
            variant: "destructive",
          });
        }
        console.error('Error deleting role:', error);
        return;
      }

      setRoles(roles.filter(role => role.id !== id));
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
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
      {/* Add Role Form */}
      <form onSubmit={handleAddRole} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Enter role name"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !newRole.trim()}
          >
            <RiAddLine /> Add Role
          </button>
        </div>
      </form>

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {roles.map((role) => (
            <div key={role.id} className="p-4 flex items-center justify-between">
              {editingRole?.id === role.id ? (
                <form onSubmit={handleUpdateRole} className="flex-1 flex gap-4">
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || !editingRole.name.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="text-amber-600 hover:text-amber-900"
                      disabled={isSubmitting}
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isSubmitting}
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 