"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiEditLine,
  RiSearchLine,
  RiAlertLine,
  RiCheckLine,
} from "react-icons/ri";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Module {
  id: string;
  name: string;
  description: string;
  path: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface ProfileResponse {
  id: string;
  email: { email: string }[];
  full_name: string;
  role: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

const DASHBOARD_PAGES = [
  {
    name: "Full Access",
    path: "*",
    description: "Access to all dashboard pages and features"
  },
  {
    name: "Viewer Access",
    path: "viewer",
    description: "Read-only access to view dashboard content"
  },
  {
    name: "Dashboard Overview",
    path: "/dashboard",
    description: "View main dashboard and analytics"
  },
  {
    name: "Inventory",
    path: "/dashboard/inventory",
    description: "Manage inventory and products",
    subPages: [
      {
        name: "Products",
        path: "/dashboard/inventory/products",
        description: "Manage product catalog"
      },
      {
        name: "Packages",
        path: "/dashboard/inventory/packages",
        description: "Configure product packages"
      }
    ]
  },
  {
    name: "Consumer",
    path: "/dashboard/consumer",
    description: "Manage consumers and participants",
    subPages: [
      {
        name: "Programs",
        path: "/dashboard/consumer/programs",
        description: "Manage training programs and schedules"
      },
      {
        name: "Participants",
        path: "/dashboard/consumer/participants",
        description: "Track and manage program participants"
      },
      {
        name: "Staff",
        path: "/dashboard/consumer/staff",
        description: "Manage staff and assignments"
      }
    ]
  },
  {
    name: "Billing",
    path: "/dashboard/billing",
    description: "Manage billing and invoices",
    subPages: [
      {
        name: "Invoices",
        path: "/dashboard/billing/invoices",
        description: "View and manage billing invoices"
      },
      {
        name: "Payments",
        path: "/dashboard/billing/payments",
        description: "Track and process payments"
      }
    ]
  },
  {
    name: "Users Management",
    path: "/dashboard/users",
    description: "Manage users and roles",
    subPages: [
      {
        name: "Roles",
        path: "/dashboard/users/roles",
        description: "Configure user roles and permissions"
      },
      {
        name: "Users",
        path: "/dashboard/users/manage",
        description: "Manage users and their roles"
      },
      {
        name: "Modules",
        path: "/dashboard/users/modules",
        description: "Manage access modules"
      },
    ]
  },
  {
    name: "Configuration",
    path: "/dashboard/config",
    description: "System settings and configuration",
  }
];

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    path: "",
  });

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

  useEffect(() => {
    fetchModules();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check for existing module with same name
      const { data: existingModules } = await supabase
        .from('modules')
        .select('id, name')
        .eq('name', formData.name);

      // Check for duplicates
      if (existingModules && existingModules.length > 0) {
        // If editing, allow same name for current module
        if (!editingModule || (editingModule && existingModules.some(m => m.id !== editingModule.id))) {
          toast({
            title: "Error",
            description: "A module with this name already exists",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update({
            name: formData.name,
            description: formData.description,
            path: formData.path
          })
          .eq('id', editingModule.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Module updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('modules')
          .insert([{
            name: formData.name,
            description: formData.description,
            path: formData.path
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Module created successfully",
        });
      }

      setFormData({ name: "", description: "", path: "" });
      setEditingModule(null);
      setIsModalOpen(false);
      fetchModules();
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: "Error",
        description: "Failed to save module",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!moduleToDelete) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module deleted successfully",
      });
      setModules(prev => prev.filter(m => m.id !== moduleToDelete.id));
      setIsDeleteModalOpen(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error",
        description: "Failed to delete module",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modules Management</h2>
          <p className="text-muted-foreground">
            Manage access modules for role assignments
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
        >
          <RiAddLine className="w-4 h-4" />
          Add New Module
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-[300px]">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules..."
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
        {filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RiAlertLine className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No modules found</p>
            <p className="text-sm mt-2">
              {searchQuery ? "No modules match your search criteria" : "Start by adding your first module"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedModules.map((module) => (
                  <tr key={module.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{module.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{module.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingModule(module);
                          setFormData({
                            name: module.name,
                            description: module.description,
                            path: module.path,
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-amber-600 hover:text-amber-900"
                        title="Edit module"
                      >
                        <RiEditLine className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setModuleToDelete(module);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete module"
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredModules.length)} of {filteredModules.length} modules
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

      {/* Add/Edit Module Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingModule ? 'Edit Module' : 'Add New Module'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingModule(null);
                  setFormData({ name: "", description: "", path: "" });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Module Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                      placeholder="Enter module name"
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
                      placeholder="Describe the module's purpose"
                      required
                    />
                  </div>
                </div>

                {/* Right Column - Page Access */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Page Access
                  </label>
                  <div className="border rounded-lg overflow-hidden flex flex-col h-[350px]">
                    {/* All Pages Section - Now Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Special Access Options */}
                      <div className="space-y-2 pb-4 border-b">
                        {/* Full Access Option */}
                        <label
                          className={`
                            flex items-start p-3 rounded-lg cursor-pointer border
                            ${formData.path === "*" ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}
                          `}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              name="page-access"
                              checked={formData.path === "*"}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  name: "Full Access",
                                  description: "Access to all dashboard pages and features",
                                  path: "*"
                                });
                              }}
                              className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                            />
                          </div>
                          <div className="ml-3 flex-grow">
                            <span className="block text-sm font-medium text-gray-900">
                              Full Access
                            </span>
                            <span className="block text-xs text-gray-500">
                              Grants access to all pages and features
                            </span>
                          </div>
                          {formData.path === "*" && (
                            <RiCheckLine className="text-amber-600 w-5 h-5" />
                          )}
                        </label>

                        {/* Viewer Access Option */}
                        <label
                          className={`
                            flex items-start p-3 rounded-lg cursor-pointer border
                            ${formData.path === "viewer" ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}
                          `}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              name="page-access"
                              checked={formData.path === "viewer"}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  name: "Viewer Access",
                                  description: "Read-only access to view dashboard content",
                                  path: "viewer"
                                });
                              }}
                              className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                            />
                          </div>
                          <div className="ml-3 flex-grow">
                            <span className="block text-sm font-medium text-gray-900">
                              Viewer Access
                            </span>
                            <span className="block text-xs text-gray-500">
                              Read-only access to view dashboard content
                            </span>
                          </div>
                          {formData.path === "viewer" && (
                            <RiCheckLine className="text-amber-600 w-5 h-5" />
                          )}
                        </label>
                      </div>

                      {/* Regular Pages */}
                      {DASHBOARD_PAGES.slice(2).map((page) => (
                        <div key={page.path} className="space-y-2">
                          {/* Main Page */}
                          <label
                            className={`
                              flex items-start p-3 rounded-lg cursor-pointer border
                              ${formData.path === page.path ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}
                            `}
                          >
                            <div className="flex items-center h-5">
                              <input
                                type="radio"
                                name="page-access"
                                checked={formData.path === page.path}
                                onChange={() => {
                                  setFormData({
                                    ...formData,
                                    name: page.name,
                                    description: page.description,
                                    path: page.path
                                  });
                                }}
                                className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                              />
                            </div>
                            <div className="ml-3 flex-grow">
                              <span className="block text-sm font-medium text-gray-900">
                                {page.name}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {page.description}
                              </span>
                            </div>
                            {formData.path === page.path && (
                              <RiCheckLine className="text-amber-600 w-5 h-5" />
                            )}
                          </label>

                          {/* Sub Pages */}
                          {page.subPages && (
                            <div className="ml-6 space-y-2 relative before:absolute before:left-[-12px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
                              {page.subPages.map((subPage) => (
                                <label
                                  key={subPage.path}
                                  className={`
                                    flex items-start p-3 rounded-lg cursor-pointer border relative
                                    ${formData.path === subPage.path ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}
                                    before:absolute before:left-[-12px] before:top-1/2 before:w-3 before:h-px before:bg-gray-200
                                  `}
                                >
                                  <div className="flex items-center h-5">
                                    <input
                                      type="radio"
                                      name="page-access"
                                      checked={formData.path === subPage.path}
                                      onChange={() => {
                                        setFormData({
                                          ...formData,
                                          name: subPage.name,
                                          description: subPage.description,
                                          path: subPage.path
                                        });
                                      }}
                                      className="h-4 w-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                                    />
                                  </div>
                                  <div className="ml-3 flex-grow">
                                    <div className="flex items-center gap-2">
                                      <span className="block text-sm font-medium text-gray-900">
                                        {subPage.name}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {subPage.path.split('/').slice(-1)[0]}
                                      </span>
                                    </div>
                                    <span className="block text-xs text-gray-500">
                                      {subPage.description}
                                    </span>
                                  </div>
                                  {formData.path === subPage.path && (
                                    <RiCheckLine className="text-amber-600 w-5 h-5" />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingModule(null);
                    setFormData({ name: "", description: "", path: "" });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formData.path}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : editingModule ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Module Modal */}
      {isDeleteModalOpen && moduleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <RiAlertLine className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Delete Module
              </h2>
            </div>
            
            <p className="text-gray-500 mb-2">
              Are you sure you want to delete <span className="font-medium">{moduleToDelete.name}</span>?
            </p>
            
            <p className="text-red-600 text-sm mb-6">
              This will also remove all role associations. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setModuleToDelete(null);
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