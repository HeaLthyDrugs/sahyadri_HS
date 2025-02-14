"use client";

import { useState, useEffect } from "react";
import {
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiEditLine,
  RiSearchLine,
  RiAlertLine,
} from "react-icons/ri";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  path: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleModules, setRoleModules] = useState<{[key: string]: string[]}>({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedModules: [] as string[]
  });

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setRoles(data || []);

      // Fetch module assignments for each role
      data?.forEach(role => {
        fetchRoleModules(role.id);
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch modules",
        variant: "destructive",
      });
    }
  };

  const fetchRoleModules = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_modules')
        .select('module_id')
        .eq('role_id', roleId);

      if (error) throw error;
      
      setRoleModules(prev => ({
        ...prev,
        [roleId]: data.map(rm => rm.module_id)
      }));
    } catch (error) {
      console.error('Error fetching role modules:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq('id', editingRole.id);

        if (error) throw error;

        // Update module assignments
        await supabase
          .from('role_modules')
          .delete()
          .eq('role_id', editingRole.id);

        if (formData.selectedModules.length > 0) {
          const { error: moduleError } = await supabase
            .from('role_modules')
            .insert(
              formData.selectedModules.map(moduleId => ({
                role_id: editingRole.id,
                module_id: moduleId
              }))
            );

          if (moduleError) throw moduleError;
        }

        toast({
          title: "Success",
          description: "Role updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from('roles')
          .insert([{
            name: formData.name,
            description: formData.description,
          }])
          .select()
          .single();

        if (error) throw error;

        // Insert module assignments
        if (formData.selectedModules.length > 0) {
          const { error: moduleError } = await supabase
            .from('role_modules')
            .insert(
              formData.selectedModules.map(moduleId => ({
                role_id: data.id,
                module_id: moduleId
              }))
            );

          if (moduleError) throw moduleError;
        }

        toast({
          title: "Success",
          description: "Role created successfully",
        });
      }

      setFormData({ name: "", description: "", selectedModules: [] });
      setEditingRole(null);
      setIsModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: "Error",
        description: "Failed to save role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles Management</h2>
          <p className="text-muted-foreground">
            Create and manage roles with module access control
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
        >
          <RiAddLine className="w-4 h-4" />
          Add New Role
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-[300px]">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rounded-lg border border-gray-300 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {[10, 25, 50, 100].map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span>entries</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RiAlertLine className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No roles found</p>
            <p className="text-sm mt-2">
              {searchQuery ? "No roles match your search criteria" : "Start by adding your first role"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Modules
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{role.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {roleModules[role.id]?.map(moduleId => {
                          const module = modules.find(m => m.id === moduleId);
                          return module ? (
                            <span key={moduleId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {module.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setFormData({
                            name: role.name,
                            description: role.description,
                            selectedModules: roleModules[role.id] || []
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-amber-600 hover:text-amber-900"
                        title="Edit role"
                      >
                        <RiEditLine className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setRoleToDelete(role);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete role"
                      >
                        <RiDeleteBinLine className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRoles.length)} of {filteredRoles.length} roles
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRole(null);
                  setFormData({ name: "", description: "", selectedModules: [] });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Modules
                </label>
                <div className="border rounded-lg divide-y divide-gray-200">
                  {/* Full Access Option */}
                  <div className="p-4 bg-amber-50/50">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.selectedModules.some(id => {
                          const mod = modules.find(m => m.id === id);
                          return mod?.path === "*";
                        })}
                        onChange={(e) => {
                          const fullAccessModule = modules.find(m => m.path === "*");
                          if (fullAccessModule) {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedModules: [fullAccessModule.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedModules: []
                              });
                            }
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Full Access</span>
                        <p className="text-sm text-gray-500 mt-0.5">Grants access to all modules and features</p>
                      </div>
                    </label>
                  </div>

                  {/* Individual Modules */}
                  <div className="p-4">
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Individual Module Access</span>
                      <p className="text-xs text-gray-500 mt-0.5">Select specific modules to grant access to</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {modules
                        .filter(module => module.path !== "*") // Exclude Full Access from this section
                        .map(module => (
                          <label
                            key={module.id}
                            className={`
                              relative flex items-start p-3 rounded-lg border
                              ${formData.selectedModules.includes(module.id)
                                ? 'border-amber-200 bg-amber-50 ring-1 ring-amber-500'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                              }
                              cursor-pointer transition-colors
                            `}
                          >
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={formData.selectedModules.includes(module.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Remove Full Access if present
                                    setFormData({
                                      ...formData,
                                      selectedModules: [
                                        ...formData.selectedModules.filter(id => {
                                          const mod = modules.find(m => m.id === id);
                                          return mod?.path !== "*";
                                        }),
                                        module.id
                                      ]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedModules: formData.selectedModules.filter(id => id !== module.id)
                                    });
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                            </div>
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-900">{module.name}</span>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{module.description}</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Selected Modules Summary */}
                  {formData.selectedModules.length > 0 && (
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Selected Modules</span>
                        <span className="text-xs text-gray-500">{formData.selectedModules.length} selected</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.selectedModules.map(moduleId => {
                          const module = modules.find(m => m.id === moduleId);
                          return module ? (
                            <span
                              key={moduleId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                            >
                              {module.name}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    selectedModules: formData.selectedModules.filter(id => id !== moduleId)
                                  });
                                }}
                                className="ml-1 rounded-full p-0.5 hover:bg-amber-200 transition-colors"
                              >
                                <RiCloseLine className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRole(null);
                    setFormData({ name: "", description: "", selectedModules: [] });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingRole ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Modal */}
      {isDeleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <RiAlertLine className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Delete Role
              </h2>
      </div>

            <p className="text-gray-500 mb-2">
              Are you sure you want to delete <span className="font-medium">{roleToDelete.name}</span>?
            </p>
            
            <p className="text-red-600 text-sm mb-6">
              This will also remove all module assignments. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setRoleToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
                    </div>
            )}
    </div>
  );
} 