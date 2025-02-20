"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RiAddLine, RiEditLine, RiDeleteBinLine } from "react-icons/ri";

interface Role {
  id: string;
  name: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const supabase = createClient();

  // Fetch roles
  useEffect(() => {
    async function fetchRoles() {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      setRoles(data || []);
      setIsLoading(false);
    }

    fetchRoles();
  }, [supabase]);

  // Add new role
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    const { data, error } = await supabase
      .from('roles')
      .insert([{ name: newRole.trim() }])
      .select()
      .single();

    if (error) {
      console.error('Error adding role:', error);
      return;
    }

    setRoles([...roles, data]);
    setNewRole("");
  };

  // Update role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.name.trim()) return;

    const { error } = await supabase
      .from('roles')
      .update({ name: editingRole.name.trim() })
      .eq('id', editingRole.id);

    if (error) {
      console.error('Error updating role:', error);
      return;
    }

    setRoles(roles.map(role => 
      role.id === editingRole.id ? editingRole : role
    ));
    setEditingRole(null);
  };

  // Delete role
  const handleDeleteRole = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this role?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting role:', error);
      return;
    }

    setRoles(roles.filter(role => role.id !== id));
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Role Management</h1>
        <p className="text-gray-500">Create and manage user roles</p>
      </div>

      {/* Add Role Form */}
      <form onSubmit={handleAddRole} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Enter role name"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2"
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
                  />
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRole(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-gray-900">{role.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {roles.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No roles found. Add your first role above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



